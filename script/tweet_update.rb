require 'twitter'
require 'json'
require 'open-uri'

def tweet(tweet)

  twitter_client = ::Twitter::REST::Client.new do |config|
    config.consumer_key = env['TWITTER_CONSUMER_KEY']
    config.consumer_secret = env['TWITTER_CONSUMER_SECRET']
    config.access_token = env['TWITTER_ACCESS_TOKEN']
    config.access_token_secret = env['TWITTER_ACCESS_TOKEN_SECRET']
  end

  twitter_client.update(tweet)

end

def get_commit_message(sha: '')
  uri = URI.parse("https://api.github.com/repos/denebola213/web-pages/git/commits/#{sha}")
  return JSON.parse(uri.read)
end

def get_update_url(sha: '')

  res = `git show --name-only #{sha}`.split(/\n/)

  file_list = Array.new
  while (res.size > 6) do
    tmp_file = res.pop
    tmp_file.scan /^content(\/(tech|diary).*)$/ do |file|
      path = file[0].sub(/.md$/, '')
      file_list.push "https://www.st-albireo.net#{path}"
    end
  end

  return file_list
end

res = get_commit_message(sha: '619c51c633019112755564c327e0e4c5433d9d56')

tweet_text = ''

res['message'].scan(/^post\s(.+)$/) do |matched|
  tweet_text << "#{res['author']['date']} サイトが更新されました。\n"
  tweet_text << "  > #{matched.first}\n"
  tweet_text << "\n"
end

get_update_url(sha: '619c51c633019112755564c327e0e4c5433d9d56').each do |path|
  tweet_text << "#{path}\n"
end

tweet(tweet_text)
