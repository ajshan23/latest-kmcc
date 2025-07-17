import { admin } from "../config/firebase";

export const sendGlobalNotification = async ({
  title,
  body,
  data = {},
}: {
  title: string;
  body: string;
  data?: Record<string, string>;
}) => {
  const message = {
    notification: {
      title,
      body,
    },
    data,
    topic: "global",
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("Notification sent:", response);
  } catch (err) {
    console.error("Notification error:", err);
  }
};
