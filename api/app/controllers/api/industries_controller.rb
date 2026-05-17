# frozen_string_literal: true

module Api
  class IndustriesController < ApplicationController
    def index
      rows = Industry.order(:name)
      render json: { data: rows.map { |i| { id: i.id, name: i.name } } }
    end
  end
end
