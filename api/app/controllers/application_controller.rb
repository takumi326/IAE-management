require "json"
require "net/http"
require "uri"

class ApplicationController < ActionController::API
  before_action :authenticate_request!

  private

  attr_reader :current_subject

  def authenticate_request!
    return if Rails.env.test? || Rails.env.development?
    token = bearer_token
    if token.blank?
      render json: {
        error: {
          code: "missing_token",
          message: "Authorization に Bearer トークンがありません。"
        }
      }, status: :unauthorized
      return
    end

    payload = decode_supabase_jwt(token)
    email = payload["email"].to_s
    if payload.blank? || email.blank?
      render json: {
        error: {
          code: "invalid_token",
          message: "JWT の検証に失敗しました。Render の SUPABASE_URL をフロントの Supabase プロジェクト URL と一致させてください。"
        }
      }, status: :unauthorized
      return
    end

    unless allowed_email?(email)
      render json: {
        error: {
          code: "email_not_allowed",
          message: "このメールアドレスは許可されていません（環境変数 ALLOWED_EMAILS を確認してください）。"
        }
      }, status: :forbidden
      return
    end

    @current_subject = email
  end

  def bearer_token
    auth_header = request.headers["Authorization"].to_s
    return nil unless auth_header.start_with?("Bearer ")

    auth_header.delete_prefix("Bearer ").strip
  end

  def decode_supabase_jwt(token)
    return {} if token.blank?
    return {} if supabase_url.blank?

    decoded, = JWT.decode(token, nil, true, {
      algorithms: %w[RS256 ES256],
      jwks: ->(_options) { supabase_jwks },
      verify_iss: true,
      iss: "#{supabase_url}/auth/v1"
    })
    decoded.is_a?(Hash) ? decoded : {}
  rescue JWT::DecodeError, JWT::JWKError, JSON::ParserError, OpenSSL::SSL::SSLError, SocketError
    {}
  end

  def allowed_email?(email)
    raw = ENV.fetch("ALLOWED_EMAILS", "")
    return true if raw.blank?

    allowed = raw.split(",").map(&:strip).reject(&:blank?)
    allowed.include?(email)
  end

  def supabase_url
    ENV.fetch("SUPABASE_URL", "").delete_suffix("/")
  end

  def supabase_jwks
    cached = self.class.instance_variable_get(:@supabase_jwks_cache)
    now = Time.now.to_i
    return cached[:set] if cached && cached[:expires_at] > now

    jwks_url = ENV.fetch("SUPABASE_JWKS_URL", "#{supabase_url}/auth/v1/.well-known/jwks.json")
    response = Net::HTTP.get_response(URI.parse(jwks_url))
    return JWT::JWK::Set.new({ keys: [] }) unless response.is_a?(Net::HTTPSuccess)

    parsed = JSON.parse(response.body)
    set = JWT::JWK::Set.new(parsed)
    self.class.instance_variable_set(:@supabase_jwks_cache, { set: set, expires_at: now + 300 })
    set
  rescue StandardError
    JWT::JWK::Set.new({ keys: [] })
  end
end
