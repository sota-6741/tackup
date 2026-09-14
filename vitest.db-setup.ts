import { afterAll, beforeEach } from "vitest";
import { closeTestDb, resetTestDb } from "./src/shared/testing/test-db";

beforeEach(resetTestDb);
afterAll(closeTestDb);
