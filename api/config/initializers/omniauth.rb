Rails.application.config.middleware.use ActionDispatch::Cookies
Rails.application.config.middleware.use ActionDispatch::Session::CookieStore, key: "_iae_management_session"

OmniAuth.config.path_prefix = "/api/auth"
OmniAuth.config.allowed_request_methods = %i[get post]
OmniAuth.config.silence_get_warning = true

Rails.application.config.middleware.use OmniAuth::Builder do
  provider(
    :google_oauth2,
    ENV.fetch("GOOGLE_OAUTH_CLIENT_ID", "dummy-client-id"),
    ENV.fetch("GOOGLE_OAUTH_CLIENT_SECRET", "dummy-client-secret"),
    {
      scope: "openid,email,profile",
      prompt: "select_account"
    }
  )
end
