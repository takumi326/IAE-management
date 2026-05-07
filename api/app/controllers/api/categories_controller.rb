module Api
  class CategoriesController < ApplicationController
    def majors
      scope = MajorCategory.order(:kind, :name)
      scope = scope.where(kind: params[:kind]) if params[:kind].present?

      render json: {
        data: scope.select(:id, :kind, :name).map { |c| serialize_major(c) }
      }
    end

    def minors
      scope = MinorCategory.includes(:major_category).order(:name)
      scope = scope.where(major_category_id: params[:major_category_id]) if params[:major_category_id].present?
      scope = scope.joins(:major_category).where(major_categories: { kind: params[:kind] }) if params[:kind].present?

      render json: {
        data: scope.map { |c| serialize_minor(c) }
      }
    end

    private

    def serialize_major(category)
      {
        id: category.id,
        kind: category.kind,
        name: category.name
      }
    end

    def serialize_minor(category)
      {
        id: category.id,
        name: category.name,
        major_category: {
          id: category.major_category.id,
          kind: category.major_category.kind,
          name: category.major_category.name
        }
      }
    end
  end
end
