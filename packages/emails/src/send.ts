import type React from "react";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { render } from "@react-email/render";
import { env } from "./env";

let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
    });
  }
  return _transporter;
}

export interface Emails {
  react: React.JSX.Element;
  subject: string;
  to: string[];
  from: string;
  reply_to?: string;
}

export type EmailHtml = {
  html: string;
  subject: string;
  to: string;
  from: string;
  reply_to?: string;
};

export const sendEmail = async (email: Emails) => {
  if (process.env.NODE_ENV !== "production") return;
  const transporter = getTransporter();
  await transporter.sendMail({
    from: email.from,
    to: email.to,
    subject: email.subject,
    html: await render(email.react),
    replyTo: email.reply_to,
  });
};

export const sendBatchEmailHtml = async (emails: EmailHtml[]) => {
  if (process.env.NODE_ENV !== "production") return;
  const transporter = getTransporter();
  await Promise.all(
    emails.map((email) =>
      transporter.sendMail({
        from: email.from,
        to: email.to,
        subject: email.subject,
        html: email.html,
        replyTo: email.reply_to,
      }),
    ),
  );
};

// TODO: delete in favor of sendBatchEmailHtml
export const sendEmailHtml = sendBatchEmailHtml;

export const sendWithRender = async (email: Emails) => {
  if (process.env.NODE_ENV !== "production") return;
  const transporter = getTransporter();
  const html = await render(email.react);
  await transporter.sendMail({
    from: email.from,
    to: email.to,
    subject: email.subject,
    html,
    replyTo: email.reply_to,
  });
};
