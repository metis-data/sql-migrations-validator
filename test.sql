/*
  Warnings:

  - The primary key for the `migration_workflow` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `test_name` on the `test_workflow` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[api_key_id,pr_id,pr_name]` on the table `test_workflow` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `pr_name` to the `migration_workflow` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pr_id` to the `test_workflow` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pr_name` to the `test_workflow` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "test_workflow_test_name_key";

-- AlterTable
ALTER TABLE "migration_workflow" DROP CONSTRAINT "migration_workflow_pkey",
ADD COLUMN     "id" UUID NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "pr_name" TEXT NOT NULL,
ADD CONSTRAINT "migration_workflow_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "test_workflow" DROP COLUMN "test_name",
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "pr_id" TEXT NOT NULL,
ADD COLUMN     "pr_name" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "test_workflow_api_key_id_pr_id_pr_name_key" ON "test_workflow"("api_key_id", "pr_id", "pr_name");

-- CreateIndex
CREATE UNIQUE INDEX "migration_workflow_api_key_id_pr_id_pr_name_key" ON "migration_workflow"("api_key_id", "pr_id", "pr_name");