class ApplicationController < ActionController::API
  before_action :authenticate_request!

  private

  attr_reader :current_subject

  def authenticate_request!
    return if Rails.env.test? || Rails.env.development?
    email = session[:user_email].to_s
    if email.blank?
      render json: { error: { code: "unauthorized", message: "Unauthorized" } }, status: :unauthorized
      return
    end
    @current_subject = email
  end
end
