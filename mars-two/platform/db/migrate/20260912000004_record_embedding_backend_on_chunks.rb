class RecordEmbeddingBackendOnChunks < ActiveRecord::Migration[8.1]
  def change
    # Vectors from two different embedders are not comparable, and a search that
    # mixes them returns plausible nonsense rather than an error. Recording which
    # backend produced each chunk lets a mismatch be caught instead of ranked.
    # See docs/adr/0006-embedding-backends.md.
    add_column :document_chunks, :embedding_backend, :string
    add_index :document_chunks, %i[company_id embedding_backend]
  end
end
