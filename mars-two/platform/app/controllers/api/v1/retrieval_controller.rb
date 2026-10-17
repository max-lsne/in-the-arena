module Api
  module V1
    class RetrievalController < BaseController
      MAX_LIMIT = 20
      DEFAULT_LIMIT = 5

      def search
        raise InvalidRequest, "query is required" if params[:query].to_s.strip.blank?

        render json: {
          backend: Mars::Embedding.backend_name,
          results: chunks.map { |chunk| serialize(chunk) }
        }
      end

      private

      def chunks
        scope = DocumentChunk.all

        # Scoping to a document the caller already identified is the second half
        # of the retrieval pattern. Similarity ranks near-identical contract
        # clauses arbitrarily, so the contract is chosen from precomputed figures
        # and retrieval only has to find the right clause inside it.
        scope = scope.where(document_id: Document.where(source_ref: params[:source_ref]).select(:id)) if params[:source_ref].present?

        scope.nearest_to(Mars::Embedding.embed(params[:query]), limit: limit).includes(:document)
      end

      def limit = params.fetch(:limit, DEFAULT_LIMIT).to_i.clamp(1, MAX_LIMIT)

      def serialize(chunk)
        {
          company: chunk.company.slug,
          cite: chunk.cite,
          document_title: chunk.document.title,
          source_ref: chunk.document.source_ref,
          kind: chunk.document.kind,
          section_ref: chunk.section_ref,
          position: chunk.position,
          content: chunk.content
        }
      end
    end
  end
end
