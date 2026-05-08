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

    def create_major
      major = MajorCategory.new(major_category_params)
      if major.save
        render json: { data: serialize_major(major) }, status: :created
      else
        render_validation_error(major)
      end
    end

    def create_minor
      minor = MinorCategory.new(minor_category_params)
      if minor.save
        minor = MinorCategory.includes(:major_category).find(minor.id)
        render json: { data: serialize_minor(minor) }, status: :created
      else
        render_validation_error(minor)
      end
    end

    def update_major
      major = MajorCategory.find_by(id: params[:id])
      return render_not_found("Major category not found") if major.blank?

      if major.update(major_category_params)
        render json: { data: serialize_major(major) }
      else
        render_validation_error(major)
      end
    end

    def update_minor
      minor = MinorCategory.find_by(id: params[:id])
      return render_not_found("Minor category not found") if minor.blank?

      if minor.update(minor_category_params)
        minor = MinorCategory.includes(:major_category).find(minor.id)
        render json: { data: serialize_minor(minor) }
      else
        render_validation_error(minor)
      end
    end

    private

    def major_category_params
      params.expect(major_category: [ :kind, :name ])
    end

    def minor_category_params
      params.expect(minor_category: [ :major_category_id, :name ])
    end

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

    def render_validation_error(record)
      render json: { error: { code: "validation_error", message: "Invalid params", details: record.errors } },
             status: :unprocessable_entity
    end

    def render_not_found(message)
      render json: { error: { code: "not_found", message: message } }, status: :not_found
    end
  end
end
