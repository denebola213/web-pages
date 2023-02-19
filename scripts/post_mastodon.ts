// read TOKEN
const token = Deno.env.get("MASTODON_TOKEN");
if (typeof token === "undefined") {
    console.error("undefined MASTODON_TOKEN.");
    Deno.exit(1);
  }

async function post_status(content: string, token: string) {
    const url = new URL("https://mstdn.nostalgia-tns.net/api/v1/statuses", import.meta.url).toString();
    const body = new FormData();
    body.append("status", content);
    // DEBUG
    body.append("visibility", "direct")

    const request = new Request(url, {
        method: "POST",
        body: body,
        headers: {
          "Authorization": `Bearer ${token}`,
        },
    });

    return fetch(request)
        .then( response => {
            if (!response.ok) {
                const message = `failed to post. status:${response.status} ${response.statusText}`;
                throw new Error(message);
            } else {
                console.log(`posted status.`);
                return;
            }
        })
}

function get_commit_message(api_url: '', sha: '') {
    uri = URI.parse("#{api_url}/repos/denebola213/web-pages/git/commits/#{sha}")
    return JSON.parse(uri.read)
}

