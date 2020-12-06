require 'twitter'
require 'json'
require 'open-uri'

def tweet(tweet)

  twitter_client = ::Twitter::REST::Client.new do |config|
    config.consumer_key = ENV['TWITTER_CONSUMER_KEY']
    config.consumer_secret = ENV['TWITTER_CONSUMER_SECRET']
    config.access_token = ENV['TWITTER_ACCESS_TOKEN']
    config.access_token_secret = ENV['TWITTER_ACCESS_TOKEN_SECRET']
  end

  twitter_client.update(tweet)

end

def get_commit_message(api_url: '', sha: '')
  uri = URI.parse("#{api_url}/repos/denebola213/web-pages/git/commits/#{sha}")
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

res = get_commit_message(api_url: ENV['GITHUB_API_URL'], sha: ENV['GITHUB_SHA'])

tweet_text = ''

res['message'].scan(/^post\s(.+)$/) do |matched|
  tweet_text << "#{res['author']['date']} サイトが更新されました。\n"
  tweet_text << "  > #{matched.first}\n"
  tweet_text << "\n"
end

if (tweet_text == '')
  puts 'ページの更新ではありませんでした。'
  return
else
  get_update_url(sha: ENV['GITHUB_SHA']).each do |path|
    tweet_text << "#{path}\n"
  end

  puts 'ツイートしました。'
  puts tweet_text
  tweet(tweet_text)
end


