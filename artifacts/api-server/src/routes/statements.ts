import { Router, type IRouter } from "express";
import multer from "multer";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files and PDFs are supported"));
    }
  },
});

router.post(
  "/statements/parse",
  requireAuth,
  upload.single("statement"),
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const cardId = req.body.cardId ? parseInt(req.body.cardId, 10) : null;
    const base64 = req.file.buffer.toString("base64");
    const isPdf = req.file.mimetype === "application/pdf";

    const prompt = `You are a financial data extractor. Analyze this credit card statement and extract ALL transactions.

For each transaction return ONLY a JSON array. Do not include any explanation. The format must be:
[
  {
    "date": "YYYY-MM-DD",
    "description": "Merchant or description",
    "amount": 12.34,
    "type": "expense"
  }
]

Rules:
- "amount" must always be a positive number
- "type" is always "expense" for purchases/charges, "payment" for payments/credits
- "date" must be in ISO format YYYY-MM-DD. If year is missing, assume the current year (${new Date().getFullYear()})
- Include ALL transactions you can find
- Return ONLY valid JSON array, nothing else`;

    let messageContent: Parameters<typeof anthropic.messages.create>[0]["messages"][0]["content"];

    if (isPdf) {
      messageContent = [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64,
          },
        } as { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } },
        { type: "text", text: prompt },
      ];
    } else {
      const mediaType = req.file.mimetype as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
      messageContent = [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: base64,
          },
        },
        { type: "text", text: prompt },
      ];
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: messageContent }],
    });

    const raw = message.content[0];
    if (raw.type !== "text") {
      res.status(500).json({ error: "Unexpected response from AI" });
      return;
    }

    let transactions: Array<{ date: string; description: string; amount: number; type: string }>;
    try {
      const jsonMatch = raw.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        res
          .status(422)
          .json({
            error:
              "Could not extract transactions from statement. Make sure the image is clear and shows transaction data.",
          });
        return;
      }
      transactions = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(transactions)) {
        throw new Error("Not an array");
      }
    } catch {
      res
        .status(422)
        .json({
          error:
            "Could not parse the extracted transactions. Please try again with a clearer image.",
        });
      return;
    }

    const validated = transactions
      .filter((t) => t.date && t.amount > 0 && (t.type === "expense" || t.type === "payment"))
      .map((t) => ({
        date: t.date,
        note: t.description || null,
        amount: Math.abs(t.amount),
        type: t.type as "expense" | "payment",
        cardId: cardId || null,
      }));

    res.json({ transactions: validated, count: validated.length });
  }
);

export default router;
