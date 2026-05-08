class ApplicationController < ActionController::API
  before_action :authenticate_request!

  private

  attr_reader :current_subject

  def authenticate_request!
    return if Rails.env.test? || Rails.env.development?
    token = bearer_token
    payload = decode_supabase_jwt(token)
    email = payload["email"].to_s
    if email.blank? || !allowed_email?(email)
      render json: { error: { code: "unauthorized", message: "Unauthorized" } }, status: :unauthorized
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

    secret = ENV.fetch("SUPABASE_JWT_SECRET", "")
    return {} if secret.blank?

    decoded, = JWT.decode(token, secret, true, { algorithm: "HS256" })
    decoded.is_a?(Hash) ? decoded : {}
  rescue JWT::DecodeError
    {}
  end

  def allowed_email?(email)
    raw = ENV.fetch("ALLOWED_EMAILS", "")
    return true if raw.blank?

    allowed = raw.split(",").map(&:strip).reject(&:blank?)
    allowed.include?(email)
  end
end
