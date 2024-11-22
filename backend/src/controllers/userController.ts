import { Request, Response } from "express";

export const getUser = (req: Request, res: Response) => {
  const userId = req.params.id;
  res.json({ id: userId, name: "John Doe" });
};
