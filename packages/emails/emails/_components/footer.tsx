/** @jsxImportSource react */

import { Link, Section, Text } from "@react-email/components";
import { styles } from "./styles";

export function Footer() {
  return (
    <Section style={{ textAlign: "center" }}>
      <Text>
        <Link style={styles.link} href="https://onlystatus.dev">
          Home Page
        </Link>{" "}
        ・{" "}
        <Link style={styles.link} href="mailto:support@onlystatus.dev">
          Contact Support
        </Link>
      </Text>

      <Text>OnlyStatus</Text>
    </Section>
  );
}
