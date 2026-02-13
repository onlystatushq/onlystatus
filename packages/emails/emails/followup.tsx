/** @jsxImportSource react */

import { Body, Head, Html, Preview } from "@react-email/components";

const FollowUpEmail = () => {
  return (
    <Html>
      <Head>
        <title>How's it going with OnlyStatus?</title>
      </Head>
      <Preview>How's it going with OnlyStatus?</Preview>
      <Body>
        Hey,
        <br />
        <br />
        How's everything going with OnlyStatus so far? Let us know if you run
        into any issues or have any feedback.
        <br />
        <br />
        The OnlyStatus Team
        <br />
      </Body>
    </Html>
  );
};

export default FollowUpEmail;
