// read TOKEN
const MASTODON_TOKEN = Deno.env.get("MASTODON_TOKEN");
if (typeof MASTODON_TOKEN === "undefined") {
  console.error("undefined MASTODON_TOKEN.");
  Deno.exit(1);
}
const GITHUB_API_URL = Deno.env.get("GITHUB_API_URL");
if (typeof GITHUB_API_URL === "undefined") {
  console.error("undefined GITHUB_API_URL.");
  Deno.exit(1);
}
const GITHUB_SHA = Deno.env.get("GITHUB_SHA");
if (typeof GITHUB_SHA === "undefined") {
  console.error("undefined GITHUB_SHA.");
  Deno.exit(1);
}

async function post_status(content: string, token: string) {
  const url = new URL(
    "https://mstdn.nostalgia-tns.net/api/v1/statuses",
    import.meta.url,
  );
  const body = new FormData();
  body.append("status", content);
  // DEBUG
  body.append("visibility", "public");

  const request = new Request(url, {
    method: "POST",
    body: body,
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  return fetch(request)
    .then((response) => {
      if (!response.ok) {
        const message =
          `failed to post. status:${response.status} ${response.statusText}`;
        throw new Error(message);
      } else {
        console.log(`posted status.`);
        return;
      }
    });
}

function get_commit_message(
  endpoint: string,
  sha: string,
): Promise<string> {
  const url = new URL(
    `${endpoint}/repos/denebola213/web-pages/git/commits/${sha}`,
    import.meta.url,
  );
  return fetch(url)
    .then((res) => res.json())
    .then((json) => {
      return json.message;
    });
}

async function get_update_url(sha: string) {
  const p = Deno.run({
    cmd: ["git", "show", "--name-only", sha],
    stdout: "piped",
  });
  const out = await p.output();
  const out_list = new TextDecoder().decode(out).split(/\n/);
  const url_list = out_list
    .map((o) => [...o.matchAll(/content(\/(tech|diary).*)\./g)].flat())
    .filter((mat) => mat.length >= 3)
    .map((mat) => mat[1])
    .map((file) => "https://www.st-albireo.net" + file);

  return url_list;
}

const commit_message = await get_commit_message(GITHUB_API_URL, GITHUB_SHA);
const match_result = commit_message.match(/^post\s(.+)$/);

let status_text = "";

if (match_result && match_result.length >= 2) {
  status_text += /*commit_message.date + */ "投稿しました。\n";
  status_text += `  # ${match_result[1]}\n\n`;

  (await get_update_url(GITHUB_SHA)).forEach((url) => {
    status_text += url + "\n";
  });

  post_status(status_text, MASTODON_TOKEN);
  console.log("投稿しました。");
  console.log(status_text);
} else {
  console.log("ページの更新ではありませんでした。");
}
