import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import request from "supertest";

vi.mock("jose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jose")>();
  const { jwks } = await import("../helpers/jwks-holder");
  return { ...actual, createRemoteJWKSet: () => async () => jwks.publicKey };
});
const sendEmail = vi.fn(async (_message: { replyTo?: string }) => ({ id: "test" }));
vi.mock("../../src/shared/services/mail.service", () => ({
  mailService: { sendEmail: (message: { replyTo?: string }) => sendEmail(message) },
}));

import app from "../../src/app";
import { db } from "../../src/db";
import { company, departments } from "../../src/db/schema/company";
import { jobs } from "../../src/db/schema/jobs";
import { candidates } from "../../src/db/schema/candidates";
import { users } from "../../src/db/schema/users";
import { sendCandidateEmail } from "../../src/shared/services/candidate-mailer";
import { initTestKeys, bearer } from "../helpers/jwt";

// Each job can name where candidates' replies to its automatic emails go, such as the person
// hiring for it. Emails written by hand keep their writer as the reply address.

const SUFFIX = `replyto${Date.now()}`;
let managerAuth: string, managerId: number;
let companyId: number, departmentId: number;
const jobIds: number[] = [];

const storedReplyTo = async (id: number) =>
  (await db.select({ replyTo: jobs.replyToEmail }).from(jobs).where(eq(jobs.id, id)))[0]?.replyTo;

async function createJob(body: Record<string, unknown>) {
  return request(app)
    .post("/api/jobs")
    .set("Authorization", managerAuth)
    .send({ title: `Job ${SUFFIX}`, departmentId, employmentType: "full_time", ...body });
}

async function candidateOn(jobId: number, tag: string) {
  const [row] = await db
    .insert(candidates)
    .values({ firstName: "Test", lastName: tag, email: `${tag}.${SUFFIX}@example.test`, jobId })
    .returning({ id: candidates.id });
  return row!.id;
}

const email = (candidateId: number, replyTo?: string) =>
  sendCandidateEmail({
    candidateId,
    to: "someone@example.test",
    kind: "application_received",
    subject: "Thanks",
    html: "<p>Thanks</p>",
    ...(replyTo ? { replyTo } : {}),
  });

beforeAll(async () => {
  await initTestKeys();
  const [co] = await db.insert(company).values({ name: `Co ${SUFFIX}`, email: `co.${SUFFIX}@example.test` }).returning();
  companyId = co!.id;
  const [dept] = await db.insert(departments).values({ name: `Dept ${SUFFIX}`, companyId }).returning();
  departmentId = dept!.id;
  const manager = await bearer({ email: `manager.${SUFFIX}@example.test`, role: "hiring_manager" });
  managerAuth = manager.authorization;
  managerId = manager.user.id;
});

beforeEach(() => sendEmail.mockClear());

afterAll(async () => {
  await db.delete(candidates).where(inArray(candidates.jobId, jobIds));
  await db.delete(jobs).where(inArray(jobs.id, jobIds));
  await db.delete(departments).where(eq(departments.id, departmentId));
  await db.delete(company).where(eq(company.id, companyId));
  await db.delete(users).where(eq(users.id, managerId));
});

describe("a job's reply address", () => {
  it("is saved when a job is created, and cleared by an empty value", async () => {
    const res = await createJob({ replyToEmail: " jay@example.test " });
    expect(res.status).toBe(201);
    const jobId = res.body.data.id as number;
    jobIds.push(jobId);
    expect(await storedReplyTo(jobId)).toBe("jay@example.test");

    const cleared = await request(app)
      .put(`/api/jobs/${jobId}`)
      .set("Authorization", managerAuth)
      .send({ replyToEmail: "" });
    expect(cleared.status).toBe(200);
    expect(await storedReplyTo(jobId)).toBeNull();
  });

  it("is left alone by an edit that does not send it", async () => {
    const res = await createJob({ replyToEmail: "cj@example.test" });
    const jobId = res.body.data.id as number;
    jobIds.push(jobId);

    await request(app).put(`/api/jobs/${jobId}`).set("Authorization", managerAuth).send({ location: "Remote" });
    expect(await storedReplyTo(jobId)).toBe("cj@example.test");
  });

  it("refuses something that is not an email address", async () => {
    const res = await createJob({ replyToEmail: "not an email" });
    expect(res.status).toBe(400);
  });

  it("is never shown on the careers page", async () => {
    const res = await createJob({ replyToEmail: "jay@example.test", status: "published" });
    const jobId = res.body.data.id as number;
    jobIds.push(jobId);

    const page = await request(app).get(`/public/jobs/${jobId}`);
    expect(page.status).toBe(200);
    expect(JSON.stringify(page.body)).not.toContain("jay@example.test");
  });
});

describe("emails to a job's candidates", () => {
  it("send replies to the job's reply address", async () => {
    const res = await createJob({ replyToEmail: "jay@example.test" });
    jobIds.push(res.body.data.id);
    const candidateId = await candidateOn(res.body.data.id, "withreply");

    expect((await email(candidateId)).sent).toBe(true);
    expect(sendEmail.mock.calls[0]![0].replyTo).toBe("jay@example.test");
  });

  it("keep a reply address the caller chose, such as the writer of a manual email", async () => {
    const res = await createJob({ replyToEmail: "jay@example.test" });
    jobIds.push(res.body.data.id);
    const candidateId = await candidateOn(res.body.data.id, "manual");

    await email(candidateId, "Writer <writer@example.test>");
    expect(sendEmail.mock.calls[0]![0].replyTo).toBe("Writer <writer@example.test>");
  });

  it("set no reply address when the job has none, so replies go to the sending address", async () => {
    const res = await createJob({});
    jobIds.push(res.body.data.id);
    const candidateId = await candidateOn(res.body.data.id, "noreply");

    await email(candidateId);
    expect(sendEmail.mock.calls[0]![0].replyTo).toBeUndefined();
  });
});
