import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { decode, sign, verify } from "hono/jwt";
import { prettyJSON } from "hono/pretty-json";
const secret = "mySecretKey";
export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
  };
  Variables: {
    userId: string;
  };
}>();
blogRouter.use(prettyJSON());

blogRouter.use("/*", async (c, next) => {
  const header = c.req.header("authorization") || "";
  const token = header.split(" ")[1];

  try {
    const response = await verify(token, secret);
    if (response.id) {
      c.set("userId", response.id);
      await next();
    } else {
      c.status(403);
      return c.json({ error: "unauthorized" });
    }
  } catch (e) {
    c.status(403);
    console.log(e);
    return c.json({ error: "unauthorized" });
  }
});

blogRouter.post("/", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const body = await c.req.json();
    const userId = c.get("userId");
    const blog = await prisma.post.create({
      data: {
        title: body.title,
        content: body.content,
        authorId: userId,
      },
    });
    console.log(blog);
  } catch (error) {
    c.status(503);
    console.log(error);
    return c.text("Something went wrong");
  }
});

blogRouter.put("/", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  const body = await c.req.json();
  const blog = await prisma.post.update({
    where: {
      id: body.id,
    },
    data: {
      title: body.title,
      content: body.content,
    },
  });
  if (blog) {
    c.status(200);
    c.json({
      msg: "Updated Successfully",
      id: blog.id,
    });
  } else {
    c.status(404);
    c.json({
      error: "Error while Updating",
    });
  }
});

blogRouter.get("/:id", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = c.req.param("id");
  const blog = await prisma.post.findFirst({
    where: {
      id: body,
    },
  });
  if (blog) {
    c.status(200);
    c.json({
      blog: blog.title,
    });
  } else {
    c.status(404);
    c.json({
      error: "User Not found",
    });
  }
});

blogRouter.get("/bulk", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const blogs = await prisma.post.findMany();
  if (blogs) {
    c.status(200);
    return c.json({
      blogs,
    });
  } else {
    c.status(404);
    return c.text("Unable to fetch blogs");
  }
});
