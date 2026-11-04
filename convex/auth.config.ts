import { env } from "./lib/env";

const authConfig = {
  providers: [
    {
      domain: env.clerkIssuerDomain(),
      applicationID: "convex",
    },
  ],
};

export default authConfig;
