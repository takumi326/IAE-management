module Api
  class StockDailyNotesController < ApplicationController
    def index
      notes = StockDailyNote.where(owner_key: preference_owner_key).order(recorded_on: :desc)
      render json: { data: notes.map { |n| serialize(n) } }
    end

    def destroy
      note = StockDailyNote.find_by(id: params[:id], owner_key: preference_owner_key)
      unless note
        render json: {
          error: { code: "not_found", message: "記録が見つかりません。" }
        }, status: :not_found
        return
      end

      note.destroy!
      head :no_content
    end

    def upsert
      recorded_on = parse_recorded_on(upsert_params[:recorded_on])
      unless recorded_on
        render json: {
          error: { code: "invalid_date", message: "recorded_on が有効な日付ではありません。" }
        }, status: :unprocessable_entity
        return
      end

      note = StockDailyNote.find_or_initialize_by(owner_key: preference_owner_key, recorded_on: recorded_on)
      note.hypothesis = upsert_params[:hypothesis].to_s
      note.result = upsert_params[:result].to_s
      note.sector_research = upsert_params[:sector_research].to_s

      if note.save
        render json: { data: serialize(note) }, status: note.previously_new_record? ? :created : :ok
      else
        render json: {
          error: { code: "validation_error", message: "保存できませんでした。", details: note.errors }
        }, status: :unprocessable_entity
      end
    end

    private

    def upsert_params
      params.expect(stock_daily_note: [ :recorded_on, :hypothesis, :result, :sector_research ])
    end

    def parse_recorded_on(value)
      return nil if value.blank?

      Date.iso8601(value.to_s)
    rescue ArgumentError
      nil
    end

    def serialize(note)
      {
        id: note.id,
        recorded_on: note.recorded_on.iso8601,
        hypothesis: note.hypothesis.to_s,
        result: note.result.to_s,
        sector_research: note.sector_research.to_s,
        updated_at: note.updated_at.iso8601(3)
      }
    end
  end
end
