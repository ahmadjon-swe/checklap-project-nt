import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Single consolidated migration representing the complete current schema.
 * Replaces the previous chain of 10 incremental migrations that were
 * broken on fresh installs (duplicate column additions, double index drops).
 */
export class ConsolidatedSchema1781100000000 implements MigrationInterface {
  name = 'ConsolidatedSchema1781100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Enums ────────────────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('student', 'teacher', 'moderator', 'support', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_auth_provider_enum" AS ENUM('local', 'google')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tests_result_visibility_enum" AS ENUM('percentage_only', 'correct_incorrect', 'full_review')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."questions_difficulty_enum" AS ENUM('easy', 'medium', 'hard')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."test_sessions_status_enum" AS ENUM('in_progress', 'submitted', 'auto_submitted', 'expired')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."subscription_plans_billing_period_enum" AS ENUM('monthly', 'yearly')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."subscriptions_status_enum" AS ENUM('active', 'expired', 'cancelled', 'pending')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."subscriptions_payment_method_enum" AS ENUM('stripe', 'manual', 'payme', 'click')`,
    );

    // ── users ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"                    uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "email"                 varchar,
        "password_hash"         varchar,
        "first_name"            varchar(100)  NOT NULL DEFAULT '',
        "last_name"             varchar(100)  NOT NULL DEFAULT '',
        "avatar_url"            varchar,
        "role"                  "public"."users_role_enum" NOT NULL DEFAULT 'student',
        "auth_provider"         "public"."users_auth_provider_enum" NOT NULL DEFAULT 'local',
        "google_id"             varchar,
        "telegram_id"           varchar,
        "telegram_username"     varchar,
        "telegram_chat_id"      varchar,
        "link_token"            varchar,
        "link_token_expires_at" TIMESTAMP WITH TIME ZONE,
        "is_verified"           boolean       NOT NULL DEFAULT false,
        "is_active"             boolean       NOT NULL DEFAULT true,
        "is_guest"              boolean       NOT NULL DEFAULT false,
        "two_factor_enabled"    boolean       NOT NULL DEFAULT false,
        "pending_email"         varchar,
        "created_at"            TIMESTAMP WITH TIME ZONE DEFAULT now(),
        "updated_at"            TIMESTAMP WITH TIME ZONE DEFAULT now(),
        "deleted_at"            TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3"  UNIQUE ("email"),
        CONSTRAINT "UQ_0bd5012aeb82628e07f6a1be53b"  UNIQUE ("google_id"),
        CONSTRAINT "UQ_1a1e4649fd31ea6ec6b025c7bfc"  UNIQUE ("telegram_id"),
        CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433"  PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ace513fa30d485cfd25c11a9e4" ON "users" ("role")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0bd5012aeb82628e07f6a1be53" ON "users" ("google_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1a1e4649fd31ea6ec6b025c7bf" ON "users" ("telegram_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3b2d0772b4cf5e8f24aadefa6f" ON "users" ("is_guest")`,
    );

    // ── tests ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "tests" (
        "id"                  uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "teacher_id"          uuid          NOT NULL,
        "title"               varchar(500)  NOT NULL,
        "description"         text,
        "time_limit_minutes"  integer,
        "start_at"            TIMESTAMP WITH TIME ZONE,
        "end_at"              TIMESTAMP WITH TIME ZONE,
        "result_visibility"   "public"."tests_result_visibility_enum" NOT NULL DEFAULT 'percentage_only',
        "passing_threshold"   numeric(5,2),
        "randomize_questions" boolean       NOT NULL DEFAULT true,
        "shuffle_options"     boolean       NOT NULL DEFAULT true,
        "enforce_fullscreen"  boolean       NOT NULL DEFAULT false,
        "is_published"        boolean       NOT NULL DEFAULT false,
        "access_code"         varchar(12),
        "created_at"          TIMESTAMP     NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMP     NOT NULL DEFAULT now(),
        "deleted_at"          TIMESTAMP,
        CONSTRAINT "UQ_tests_access_code"              UNIQUE ("access_code"),
        CONSTRAINT "PK_4301ca51edf839623386860aed2"    PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_3a4e54902753a8b6415963a3ea" ON "tests" ("teacher_id")`,
    );

    // ── options ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "options" (
        "id"          uuid    NOT NULL DEFAULT uuid_generate_v4(),
        "question_id" uuid    NOT NULL,
        "body"        text    NOT NULL,
        "image_url"   varchar,
        "is_correct"  boolean NOT NULL DEFAULT false,
        "order_index" integer NOT NULL DEFAULT 0,
        "created_at"  TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_d232045bdb5c14d932fba18d957" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_2bdd03245b8cb040130fe16f21" ON "options" ("question_id")`,
    );

    // ── questions ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "questions" (
        "id"          uuid    NOT NULL DEFAULT uuid_generate_v4(),
        "test_id"     uuid    NOT NULL,
        "body"        text    NOT NULL,
        "image_url"   varchar,
        "explanation" text,
        "difficulty"  "public"."questions_difficulty_enum" NOT NULL DEFAULT 'medium',
        "score"       numeric(8,2) NOT NULL DEFAULT '1',
        "topic"       varchar(255),
        "order_index" integer NOT NULL DEFAULT 0,
        "created_at"  TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"  TIMESTAMP,
        CONSTRAINT "PK_08a6d4b0f49ff300bf3a0ca60ac" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_b1f107600ed9ed81aba56edfce" ON "questions" ("test_id")`,
    );

    // ── item_stats ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "item_stats" (
        "id"               uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "question_id"      uuid         NOT NULL,
        "total_attempts"   integer      NOT NULL DEFAULT 0,
        "correct_attempts" integer      NOT NULL DEFAULT 0,
        "avg_time_seconds" numeric(8,2) NOT NULL DEFAULT '0',
        "difficulty_index" numeric(5,4) NOT NULL DEFAULT '0',
        "updated_at"       TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_90530fadd937bd65c2f369bfc08"  UNIQUE ("question_id"),
        CONSTRAINT "REL_90530fadd937bd65c2f369bfc0" UNIQUE ("question_id"),
        CONSTRAINT "PK_b702ba98fd1fbbf221f679df527" PRIMARY KEY ("id")
      )
    `);

    // ── email_otps ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "email_otps" (
        "id"         uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"    uuid         NOT NULL,
        "code"       varchar(6)   NOT NULL,
        "expires_at" TIMESTAMP    NOT NULL,
        "is_used"    boolean      NOT NULL DEFAULT false,
        "created_at" TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "PK_c66a6bae8086377ae2b0f5b177e" PRIMARY KEY ("id")
      )
    `);

    // ── refresh_tokens ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id"          uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"     uuid         NOT NULL,
        "token_hash"  varchar      NOT NULL,
        "expires_at"  TIMESTAMP    NOT NULL,
        "device_info" varchar,
        "ip_address"  varchar(45),
        "created_at"  TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_3ddc983c5f7bcf132fd8732c3f" ON "refresh_tokens" ("user_id")`,
    );

    // ── groups ───────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "groups" (
        "id"          uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "teacher_id"  uuid         NOT NULL,
        "name"        varchar(255) NOT NULL,
        "description" text,
        "invite_code" varchar(12)  NOT NULL,
        "is_active"   boolean      NOT NULL DEFAULT true,
        "created_at"  TIMESTAMP    NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP    NOT NULL DEFAULT now(),
        "deleted_at"  TIMESTAMP,
        CONSTRAINT "UQ_d93a573770a9d8c51c59c6c0f2d" UNIQUE ("invite_code"),
        CONSTRAINT "PK_659d1483316afb28afd3a90646e" PRIMARY KEY ("id")
      )
    `);

    // ── group_members ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "group_members" (
        "id"         uuid      NOT NULL DEFAULT uuid_generate_v4(),
        "group_id"   uuid      NOT NULL,
        "student_id" uuid      NOT NULL,
        "is_active"  boolean   NOT NULL DEFAULT true,
        "joined_at"  TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_a0cebd4894ed8e8372b5005a0ff" UNIQUE ("group_id", "student_id"),
        CONSTRAINT "PK_86446139b2c96bfd0f3b8638852" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_2c840df5db52dc6b4a1b0b69c6" ON "group_members" ("group_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_48b60c120c5dac01fe49d9be53" ON "group_members" ("student_id")`,
    );

    // ── test_sessions ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "test_sessions" (
        "id"                   uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "test_id"              uuid         NOT NULL,
        "student_id"           uuid         NOT NULL,
        "status"               "public"."test_sessions_status_enum" NOT NULL DEFAULT 'in_progress',
        "question_order"       jsonb        NOT NULL,
        "started_at"           TIMESTAMP    NOT NULL,
        "submitted_at"         TIMESTAMP WITH TIME ZONE,
        "expires_at"           TIMESTAMP WITH TIME ZONE,
        "ip_address"           varchar(45),
        "user_agent"           text,
        "tab_switch_count"     integer      NOT NULL DEFAULT 0,
        "fullscreen_violations" integer     NOT NULL DEFAULT 0,
        "created_at"           TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_8993d12a01ce3687371821d2fbd" UNIQUE ("test_id", "student_id"),
        CONSTRAINT "PK_e807cb96e1f86f25f5559360f27" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_dd7f8f85efafcb22fd970f7416" ON "test_sessions" ("test_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5cc32bbb699294f134f619de5a" ON "test_sessions" ("student_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1348ffbfc210e54f29818bf31c" ON "test_sessions" ("status")`,
    );

    // ── results ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "results" (
        "id"                 uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "session_id"         uuid         NOT NULL,
        "student_id"         uuid         NOT NULL,
        "test_id"            uuid         NOT NULL,
        "raw_score"          numeric(10,2) NOT NULL,
        "max_possible_score" numeric(10,2) NOT NULL,
        "percentage"         numeric(5,2)  NOT NULL,
        "passed"             boolean,
        "total_questions"    integer       NOT NULL,
        "correct_count"      integer       NOT NULL,
        "incorrect_count"    integer       NOT NULL,
        "unanswered_count"   integer       NOT NULL,
        "time_taken_seconds" integer       NOT NULL,
        "computed_at"        TIMESTAMP     NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_316df995ef59050d9f054994cf4"  UNIQUE ("session_id"),
        CONSTRAINT "REL_316df995ef59050d9f054994cf" UNIQUE ("session_id"),
        CONSTRAINT "PK_e8f2a9191c61c15b627c117a678" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_7c5bf104ec5fbc6d177be01af8" ON "results" ("student_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_47aba24285044c104709127779" ON "results" ("test_id")`,
    );

    // ── session_answers ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "session_answers" (
        "id"                  uuid      NOT NULL DEFAULT uuid_generate_v4(),
        "session_id"          uuid      NOT NULL,
        "question_id"         uuid      NOT NULL,
        "selected_option_ids" jsonb     NOT NULL DEFAULT '[]',
        "time_spent_seconds"  integer,
        "answered_at"         TIMESTAMP,
        "created_at"          TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_c2dc20a4592a9571689267c58f8" UNIQUE ("session_id", "question_id"),
        CONSTRAINT "PK_79307facd01710dc9f7e2893304" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_09aa29e6a9da93ea01b65a29cc" ON "session_answers" ("session_id")`,
    );

    // ── subscription_plans ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "subscription_plans" (
        "id"                    uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "name"                  varchar(50)  NOT NULL,
        "price"                 numeric(10,2) NOT NULL DEFAULT '0',
        "billing_period"        "public"."subscription_plans_billing_period_enum" NOT NULL DEFAULT 'monthly',
        "max_tests_per_day"     integer,
        "max_questions_per_test" integer,
        "max_groups"            integer,
        "can_export"            boolean      NOT NULL DEFAULT false,
        "can_use_analytics"     boolean      NOT NULL DEFAULT false,
        "can_import"            boolean      NOT NULL DEFAULT false,
        "created_at"            TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_ae18a0f6e0143f06474aa8cef1f" UNIQUE ("name"),
        CONSTRAINT "PK_9ab8fe6918451ab3d0a4fb6bb0c" PRIMARY KEY ("id")
      )
    `);

    // ── subscriptions ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id"                     uuid      NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"                uuid      NOT NULL,
        "plan_id"                uuid      NOT NULL,
        "status"                 "public"."subscriptions_status_enum" NOT NULL DEFAULT 'pending',
        "payment_method"         "public"."subscriptions_payment_method_enum" NOT NULL,
        "stripe_subscription_id" varchar,
        "starts_at"              TIMESTAMP WITH TIME ZONE NOT NULL,
        "ends_at"                TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at"             TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"             TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_d0a95ef8a28188364c546eb65c" ON "subscriptions" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6ccf973355b70645eff37774de" ON "subscriptions" ("status")`,
    );

    // ── test_groups ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "test_groups" (
        "id"          uuid      NOT NULL DEFAULT uuid_generate_v4(),
        "test_id"     uuid      NOT NULL,
        "group_id"    uuid      NOT NULL,
        "assigned_by" uuid      NOT NULL,
        "assigned_at" TIMESTAMP NOT NULL DEFAULT now(),
        "start_at"    TIMESTAMP WITH TIME ZONE,
        "end_at"      TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_fa86031e645be256be65c2a0dc7" UNIQUE ("test_id", "group_id"),
        CONSTRAINT "PK_1ba56afbca87fd77194d60a3eb3" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_3de4461cfd8b3f4f963d7ed4e6" ON "test_groups" ("test_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c9cb07f6196b4065f56f10da76" ON "test_groups" ("group_id")`,
    );

    // ── Foreign keys ─────────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "tests" ADD CONSTRAINT "FK_3a4e54902753a8b6415963a3ea6" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "options" ADD CONSTRAINT "FK_2bdd03245b8cb040130fe16f21d" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "questions" ADD CONSTRAINT "FK_b1f107600ed9ed81aba56edfcea" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_stats" ADD CONSTRAINT "FK_90530fadd937bd65c2f369bfc08" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_otps" ADD CONSTRAINT "FK_8098c9c651d910c236c63826fe0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "groups" ADD CONSTRAINT "FK_e9703f1aa2b5ae1000816cf385d" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_members" ADD CONSTRAINT "FK_2c840df5db52dc6b4a1b0b69c6e" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_members" ADD CONSTRAINT "FK_48b60c120c5dac01fe49d9be535" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "test_sessions" ADD CONSTRAINT "FK_dd7f8f85efafcb22fd970f74160" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "test_sessions" ADD CONSTRAINT "FK_5cc32bbb699294f134f619de5ae" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "results" ADD CONSTRAINT "FK_316df995ef59050d9f054994cf4" FOREIGN KEY ("session_id") REFERENCES "test_sessions"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "results" ADD CONSTRAINT "FK_7c5bf104ec5fbc6d177be01af8e" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "results" ADD CONSTRAINT "FK_47aba24285044c104709127779e" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_answers" ADD CONSTRAINT "FK_09aa29e6a9da93ea01b65a29cc2" FOREIGN KEY ("session_id") REFERENCES "test_sessions"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_answers" ADD CONSTRAINT "FK_ad00353ece328d3a618753581bc" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_d0a95ef8a28188364c546eb65c1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_e45fca5d912c3a2fab512ac25dc" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "test_groups" ADD CONSTRAINT "FK_3de4461cfd8b3f4f963d7ed4e6f" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "test_groups" ADD CONSTRAINT "FK_c9cb07f6196b4065f56f10da760" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "test_groups" ADD CONSTRAINT "FK_c5ff43c573d0b961fae1055eb7c" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "test_groups" DROP CONSTRAINT "FK_c5ff43c573d0b961fae1055eb7c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "test_groups" DROP CONSTRAINT "FK_c9cb07f6196b4065f56f10da760"`,
    );
    await queryRunner.query(
      `ALTER TABLE "test_groups" DROP CONSTRAINT "FK_3de4461cfd8b3f4f963d7ed4e6f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_e45fca5d912c3a2fab512ac25dc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_d0a95ef8a28188364c546eb65c1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_answers" DROP CONSTRAINT "FK_ad00353ece328d3a618753581bc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_answers" DROP CONSTRAINT "FK_09aa29e6a9da93ea01b65a29cc2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "results" DROP CONSTRAINT "FK_47aba24285044c104709127779e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "results" DROP CONSTRAINT "FK_7c5bf104ec5fbc6d177be01af8e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "results" DROP CONSTRAINT "FK_316df995ef59050d9f054994cf4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "test_sessions" DROP CONSTRAINT "FK_5cc32bbb699294f134f619de5ae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "test_sessions" DROP CONSTRAINT "FK_dd7f8f85efafcb22fd970f74160"`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_members" DROP CONSTRAINT "FK_48b60c120c5dac01fe49d9be535"`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_members" DROP CONSTRAINT "FK_2c840df5db52dc6b4a1b0b69c6e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "groups" DROP CONSTRAINT "FK_e9703f1aa2b5ae1000816cf385d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_otps" DROP CONSTRAINT "FK_8098c9c651d910c236c63826fe0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_stats" DROP CONSTRAINT "FK_90530fadd937bd65c2f369bfc08"`,
    );
    await queryRunner.query(
      `ALTER TABLE "questions" DROP CONSTRAINT "FK_b1f107600ed9ed81aba56edfcea"`,
    );
    await queryRunner.query(
      `ALTER TABLE "options" DROP CONSTRAINT "FK_2bdd03245b8cb040130fe16f21d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tests" DROP CONSTRAINT "FK_3a4e54902753a8b6415963a3ea6"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_c9cb07f6196b4065f56f10da76"`);
    await queryRunner.query(`DROP INDEX "IDX_3de4461cfd8b3f4f963d7ed4e6"`);
    await queryRunner.query(`DROP TABLE "test_groups"`);
    await queryRunner.query(`DROP INDEX "IDX_6ccf973355b70645eff37774de"`);
    await queryRunner.query(`DROP INDEX "IDX_d0a95ef8a28188364c546eb65c"`);
    await queryRunner.query(`DROP TABLE "subscriptions"`);
    await queryRunner.query(`DROP TABLE "subscription_plans"`);
    await queryRunner.query(`DROP INDEX "IDX_09aa29e6a9da93ea01b65a29cc"`);
    await queryRunner.query(`DROP TABLE "session_answers"`);
    await queryRunner.query(`DROP INDEX "IDX_47aba24285044c104709127779"`);
    await queryRunner.query(`DROP INDEX "IDX_7c5bf104ec5fbc6d177be01af8"`);
    await queryRunner.query(`DROP TABLE "results"`);
    await queryRunner.query(`DROP INDEX "IDX_1348ffbfc210e54f29818bf31c"`);
    await queryRunner.query(`DROP INDEX "IDX_5cc32bbb699294f134f619de5a"`);
    await queryRunner.query(`DROP INDEX "IDX_dd7f8f85efafcb22fd970f7416"`);
    await queryRunner.query(`DROP TABLE "test_sessions"`);
    await queryRunner.query(`DROP INDEX "IDX_48b60c120c5dac01fe49d9be53"`);
    await queryRunner.query(`DROP INDEX "IDX_2c840df5db52dc6b4a1b0b69c6"`);
    await queryRunner.query(`DROP TABLE "group_members"`);
    await queryRunner.query(`DROP TABLE "groups"`);
    await queryRunner.query(`DROP INDEX "IDX_3ddc983c5f7bcf132fd8732c3f"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "email_otps"`);
    await queryRunner.query(`DROP TABLE "item_stats"`);
    await queryRunner.query(`DROP INDEX "IDX_b1f107600ed9ed81aba56edfce"`);
    await queryRunner.query(`DROP TABLE "questions"`);
    await queryRunner.query(`DROP INDEX "IDX_2bdd03245b8cb040130fe16f21"`);
    await queryRunner.query(`DROP TABLE "options"`);
    await queryRunner.query(`DROP INDEX "IDX_3a4e54902753a8b6415963a3ea"`);
    await queryRunner.query(`DROP TABLE "tests"`);
    await queryRunner.query(`DROP INDEX "IDX_3b2d0772b4cf5e8f24aadefa6f"`);
    await queryRunner.query(`DROP INDEX "IDX_1a1e4649fd31ea6ec6b025c7bf"`);
    await queryRunner.query(`DROP INDEX "IDX_0bd5012aeb82628e07f6a1be53"`);
    await queryRunner.query(`DROP INDEX "IDX_ace513fa30d485cfd25c11a9e4"`);
    await queryRunner.query(`DROP INDEX "IDX_97672ac88f789774dd47f7c8be"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(
      `DROP TYPE "public"."subscriptions_payment_method_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."subscriptions_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."subscription_plans_billing_period_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."test_sessions_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."questions_difficulty_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."tests_result_visibility_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."users_auth_provider_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
