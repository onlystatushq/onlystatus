import { eq } from "@openstatus/db";
import * as randomWordSlugs from "random-word-slugs";
import {
  user,
  usersToWorkspaces,
} from "@openstatus/db/src/schema/users/user";
import { workspace } from "@openstatus/db/src/schema/workspaces/workspace";

type DB = {
  insert: typeof import("@openstatus/db").db.insert;
  select: typeof import("@openstatus/db").db.select;
};

export async function createUserWithWorkspace({
  db,
  data,
}: {
  db: any;
  data: {
    name: string;
    email: string;
    passwordHash?: string;
    isRoot?: boolean;
  };
}) {
  const newUser = await db
    .insert(user)
    .values({
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash ?? null,
      isRoot: data.isRoot ? 1 : 0,
    })
    .returning()
    .get();

  let slug: string | undefined = undefined;
  while (!slug) {
    slug = randomWordSlugs.generateSlug(2);
    const existing = await db
      .select()
      .from(workspace)
      .where(eq(workspace.slug, slug))
      .get();
    if (existing) {
      slug = undefined;
    }
  }

  const newWorkspace = await db
    .insert(workspace)
    .values({ slug, name: "" })
    .returning({ id: workspace.id })
    .get();

  await db
    .insert(usersToWorkspaces)
    .values({
      userId: newUser.id,
      workspaceId: newWorkspace.id,
      role: "owner",
    })
    .returning()
    .get();

  return newUser;
}
