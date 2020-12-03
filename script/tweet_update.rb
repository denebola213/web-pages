require 'twitter'

rest_client = ::Twitter::REST::Client.new do |config|
  config.consumer_key = env['CONSUMER_KEY']
  config.consumer_secret = env['CONSUMER_SECRET']
  config.access_token = env['ACCESS_TOKEN']
  config.access_token_secret = env['ACCESS_TOKEN_SECRET']
end
