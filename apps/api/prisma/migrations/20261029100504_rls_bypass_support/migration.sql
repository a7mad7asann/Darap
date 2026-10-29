-- Update RLS policies to support transaction-scoped bypass for administrative and global operations
-- When app.bypass_rls is not set or not 'on', standard tenant isolation and default-deny are strictly enforced.

DROP POLICY IF EXISTS course_tenant_isolation ON "Course";
CREATE POLICY course_tenant_isolation ON "Course"
  FOR ALL TO PUBLIC
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS joincode_tenant_isolation ON "JoinCode";
CREATE POLICY joincode_tenant_isolation ON "JoinCode"
  FOR ALL TO PUBLIC
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS enrollment_tenant_isolation ON "Enrollment";
CREATE POLICY enrollment_tenant_isolation ON "Enrollment"
  FOR ALL TO PUBLIC
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS lesson_tenant_isolation ON "Lesson";
CREATE POLICY lesson_tenant_isolation ON "Lesson"
  FOR ALL TO PUBLIC
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS fileobject_tenant_isolation ON "FileObject";
CREATE POLICY fileobject_tenant_isolation ON "FileObject"
  FOR ALL TO PUBLIC
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS lessonfile_tenant_isolation ON "LessonFile";
CREATE POLICY lessonfile_tenant_isolation ON "LessonFile"
  FOR ALL TO PUBLIC
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS lessonprogress_tenant_isolation ON "LessonProgress";
CREATE POLICY lessonprogress_tenant_isolation ON "LessonProgress"
  FOR ALL TO PUBLIC
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS assignment_tenant_isolation ON "Assignment";
CREATE POLICY assignment_tenant_isolation ON "Assignment"
  FOR ALL TO PUBLIC
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS submission_tenant_isolation ON "AssignmentSubmission";
CREATE POLICY submission_tenant_isolation ON "AssignmentSubmission"
  FOR ALL TO PUBLIC
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS submissionattachment_tenant_isolation ON "SubmissionAttachment";
CREATE POLICY submissionattachment_tenant_isolation ON "SubmissionAttachment"
  FOR ALL TO PUBLIC
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS exam_tenant_isolation ON "Exam";
CREATE POLICY exam_tenant_isolation ON "Exam"
  FOR ALL TO PUBLIC
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS examquestion_tenant_isolation ON "ExamQuestion";
CREATE POLICY examquestion_tenant_isolation ON "ExamQuestion"
  FOR ALL TO PUBLIC
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS examattempt_tenant_isolation ON "ExamAttempt";
CREATE POLICY examattempt_tenant_isolation ON "ExamAttempt"
  FOR ALL TO PUBLIC
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS attemptanswer_tenant_isolation ON "AttemptAnswer";
CREATE POLICY attemptanswer_tenant_isolation ON "AttemptAnswer"
  FOR ALL TO PUBLIC
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS graderecord_tenant_isolation ON "GradeRecord";
CREATE POLICY graderecord_tenant_isolation ON "GradeRecord"
  FOR ALL TO PUBLIC
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
