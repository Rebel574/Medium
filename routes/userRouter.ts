import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { sign } from "hono/jwt";
import {signupInput, signinInput} from "@rohit_0x07/medium";
const secret = "mySecretKey";
export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
  };
}>();

userRouter.post("/signup", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const {success}=signupInput.safeParse(body);
  if(!success){
    c.status(403);
    return c.json({
      msg:"Input validation Error"
    })
  }
  const user = await prisma.user.create({
    // @ts-ignore
    data: {
      email: body.email,
      password: body.password,
      name: body.name,
    },
  });
  const token = await sign({ id: user.id }, secret);
  return c.json({ token: token });
});

userRouter.post("/signin", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  const body = await c.req.json();
  const {success}=signinInput.safeParse(body);
  if(!success){
    c.status(403);
    return c.json({
      msg:"Input validation Error"
    })
  }
  const user = await prisma.user.findUnique({
    where: {
      email: body.email,
      password:body.password
    },
  });
  if (!user) {
    c.status(403);
    return c.json({ error: "User Not found" });
  }
  const jwt = await sign({ id: user.id }, secret);
  return c.json({ token: jwt });
});
