export const OPARL_ENDPOINT = process.env.OPARL_ENDPOINT;
export const EMBED_JSONLD_CONTEXT = process.env.EMBED_JSONLD_CONTEXT || true;
export const MAX_OPARL_RETRIES = parseInt(process.env.MAX_OPARL_RETRIES || "5")