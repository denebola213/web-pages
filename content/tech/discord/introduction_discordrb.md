+++
title = "discordrbでdiscordのbotに入門する。"
date = 2018-08-07

[taxonomies]
tags = ["discord", "ruby", "discordrb"]
+++

**Qiitaから記事を移動してきました。著作者は同一です。**  
元記事: [イチからDiscord Bot 。for Ruby](https://qiita.com/denebola/items/efaeb0f5c20d44608a71)

# discordrbでdiscordのbotに入門する。

※基本的なCUI操作などは説明がないです。  

DiscordのBotで検索しても、みんなPythonの話しかしてない。
あまりに情報が少なくて辛かったので、今から作ろうとしている人に、残していきます。  

OS:windows10 (CentOS,Raspbian)
環境:Ruby2.3.3

## discordrbとは

**discordでbotを作るためのgem**  ...だけだと味気ないので少々詳しく。  
discordには、[外部からテキストチャット、ボイスチャットなどにアクセスできるAPI](https://discordapp.com/developers/docs/intro)があります。  
discordrbはそれらのAPIをrubyらしくいじれるようにしたラッパーです。GitHubのwikiやClassListが充実しているので、初心者でも（英語を）頑張れば使えると思います。  

## discordrbのインストール 
discordrbはgemに登録されているので、かんたんに導入できます。  
 `$ gem install discordrb`  
もちろん、 Bundlerでも使えます。Gemfileに
 `gem 'discordrb'` と追記して `$ bundle install`

## hello,worldのコードを書く
お好みのエディタで以下のコードを書いてみてください。  

```ruby
require 'discordrb'

bot = discordrb::Commands::CommandBot.new (
token: TOKEN,
client_id: CLIENT_ID,
prefix:'/',
)

bot.command :hello do |event|
 event.send_message("hallo,world.#{event.user.name}")
end

bot.run
```  

hello.rbと名前を付けて保存。
TOKENとCLIENT_IDについては後々説明します。
これで `/hello` と打つと、 `hello,[UserName].` と返ってくるbotができました。
(hello,worldじゃないやん)  

## DiscordにBotを登録する
discordには登録しているものとして話を進めます。
登録してない方は -> https://discordapp.com/register  
  
1. 次ののURLでNewAppをクリック https://discordapp.com/developers/applications/me
2. APP NAMEを決めて、「Create App」をクリック
3. 「Create a Bot User」をクリック
4. Client ID(18桁くらいの数字)とToken（click to revealをクリックして出てきた英数字）をメモ
5. 以下のURLに、Client IDを置き換えてアクセス  
discordapp.com/oauth2/authorize?client_id=**Client ID**&scope=bot&permissions=0  
6. 接続させたいサーバーを選択

登録完了。
## botを起動
まず、さっき書いたコードを開いて、メモしたClient IDとTokenを、それぞれCLIENT_IDとTOKENに書き換えます。
その後、コマンドプロンプト(ターミナル)で `$ ruby hello.rb ` でbotが起動されます。  

## Discord上で/hello
ちゃんと返って来たら、正常に稼働しています。
お疲れ様でした。  
  
  
どうだったでしょうか？ちゃんと動きましたか？
もしダメなときはコメント頂けたら、お手伝い出来るかもしれません。(気まぐれで)  

## 参考サイト
+ [Asamac blog - Discord Bot の 簡単な作り方](https://asamacs.wordpress.com/2016/06/22/discord-bot-の-簡単な作り方/)  
+ [GitHub - meew0/discordrb: Discord API for Ruby](https://github.com/meew0/discordrb/)  
+ [Documentation for meew0/discordrb (master)](http://www.rubydoc.info/github/meew0/discordrb/discordrb/)
+ [Discord - Developer Documentation](https://discordapp.com/developers/docs/intro/)


