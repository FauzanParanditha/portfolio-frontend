import publicClient from "../axios/public";

export const swrFetcherPublic = (url: string) =>
  publicClient.get(url).then((res) => res.data);
