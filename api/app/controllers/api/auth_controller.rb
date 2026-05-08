module Api
  class AuthController < ApplicationController
    skip_before_action :authenticate_request!, only: [ :google_callback, :failure ]

    def google_callback
      auth = request.env["omniauth.auth"]
      email = auth&.dig("info", "email").to_s
      if email.blank?
        redirect_to("#{web_origin}/?auth_error=oauth_failed", allow_other_host: true)
        return
      end
      unless User.exists?(email: email)
        redirect_to("#{web_origin}/?auth_error=not_allowed", allow_other_host: true)
        return
      end
      session[:user_email] = email
      redirect_to("#{web_origin}/", allow_other_host: true)
    end

    def me
      render json: { data: { email: current_subject } }
    end

    def logout
      reset_session
      head :no_content
    end

    def failure
      redirect_to("#{web_origin}/?auth_error=oauth_failed", allow_other_host: true)
    end

    private

    def web_origin
      ENV.fetch("WEB_APP_ORIGIN", "http://localhost:5173")
    end
  end
end
