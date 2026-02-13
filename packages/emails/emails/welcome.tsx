/** @jsxImportSource react */

import { Body, Head, Html, Preview } from "@react-email/components";

const WelcomeEmail = () => {
  return (
    <Html>
      <Head>
        <title>Welcome to OnlyStatus</title>
      </Head>
      <Preview>Few tips to get started with your uptime monitoring</Preview>

      <Body>
        Hey,
        <br />
        <br />
        Welcome to OnlyStatus.
        <br />
        <br />
        OnlyStatus is a self-hosted synthetic monitoring platform with status
        pages.
        <br />
        Here are a few things you can do:
        <br />- Create monitors to track your services from multiple locations.
        <br />- Set up status pages to keep your users informed.
        <br />- Configure notifications to get alerted when things go wrong.
        <br />
        <br />
        If you have any questions or feedback, just reply to this email.
        <br />
        <br />
        The OnlyStatus Team
        <br />
      </Body>
    </Html>
  );
};

export default WelcomeEmail;
