module Api
  class AuthController < ApplicationController
    def me
      render json: { data: { email: current_subject } }
    end

    def logout
      head :no_content
    end
  end
end
