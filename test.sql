DROP TABLE "test_table";

DROP INDEX "test_workflow_key";

ALTER TABLE "test_workflow"
DROP COLUMN "test_name",
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "pr_id" TEXT NOT NULL,
ADD COLUMN "pr_name" TEXT NOT NULL;

CREATE INDEX index_name ON test_table (column1, column2);
DROP TABLE test_table;
ALTER TABLE test_table DROP CONSTRAINT fk_test_table;
ALTER TABLE tbl_name  DROP COLUMN col_name;
DROP INDEX test_index;
ALTER TABLE test_table RENAME COLUMN column_name TO new_column_name;
ALTER TABLE test_table RENAME TO new_test_table;
CREATE INDEX index_name ON test_table (column1, column2);