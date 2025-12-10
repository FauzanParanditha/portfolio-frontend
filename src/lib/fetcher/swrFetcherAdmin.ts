import adminClient from "../axios/admin";

export const swrFetcherAdmin = (url: string) =>
  adminClient.get(url).then((res) => res.data);
