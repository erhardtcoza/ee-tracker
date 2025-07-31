export default {
  async fetch(request, env, ctx) {
    return new Response("EasyEquities Tracker is live.", {
      headers: { "Content-Type": "text/plain" },
    });
  },
};
