-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_teamLeaderId_fkey" FOREIGN KEY ("teamLeaderId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
