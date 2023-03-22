DROP INDEX "test_workflow_key";
DROP TABLE "test_table";
DROP TABLE "test_table" CASCADE;
DROP TABLE "test_table", "another_test_table";
DROP INDEX CONCURRENTLY "test_workflow_test_name_key";
DROP INDEX CONCURRENTLY "test_workflow_test_name_key" CASCADE;
DROP INDEX CONCURRENTLY "test_workflow_key", "test_workflow_key_2";
ALTER TABLE "test_table" RENAME COLUMN "metis" TO "new_metis";
CREATE TABLE "db_details" (
    "api_key_id" UUID NOT NULL,
    "db_schemas_data" JSON NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "db_details_pkey" PRIMARY KEY ("api_key_id","db_name","db_host"),
    CONSTRAINT "db_details_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_key"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
ALTER TABLE "db_details"
    DROP COLUMN "test_column";