module Api
  class SessionsController < ApplicationController
    def destroy
      head :no_content
    end
  end
end
