+++
title = "Raspberry Pi 4B に indi-server をインストール"
date = 2026-05-30

[taxonomies]
tags = ["astronomy", "kstars"]
+++

# Raspberry Pi 4B に indi-server をインストール

[indi-server](https://docs.indilib.org/indiserver/) と [INDI Web Manager](https://github.com/knro/indiwebmanager) を使用することで [kstars](https://kstars.kde.org/ja/) から 導入、ガイド、撮影までをリモートから行うことができます。

この構成の利点は、Raspberry Pi を完全ヘッドレスに運用できることで、LANケーブル1本で車の中のノートパソコンからすべてを操作できることです。

## 前提

本記事は、Linux での基本的なコマンド操作と SSH 接続を問題なく行えることを前提にしています。

## それぞれの役割

- [kstars](https://kstars.kde.org/ja/)
  - KDE製の天文アプリです。星図表示だけでなく、撮影やオートガイドを含む観測ワークフロー全体を扱えます。
- [Ekos](https://docs.kde.org/trunk5/en/kstars/kstars/ekos.html)
  - kstars に含まれる天体撮影向けモジュールです。導入、フォーカス、ガイド、撮影シーケンス管理などを担当します。
- [indi-server](https://docs.indilib.org/indiserver/)
  - 望遠鏡機材のドライバを実行し、クライアント(kstars/Ekosなど)との通信を仲介するサーバープロセスです。
- [INDI Web Manager](https://github.com/knro/indiwebmanager)
  - ブラウザから indi-server の起動/停止やプロファイル管理を行うための管理ツールです。kstars 側からリモート接続する際の入口として使います。

接続イメージは次の通りです。

1. NotePC上の kstars を起動
2. kstars内の Ekos から Raspberry Pi 上の INDI Web Manager に接続
3. INDI Web Manager が indi-server を管理
4. indi-server が各機材ドライバと通信して、赤道儀やカメラを制御

## 構成: 私の例

シンプルに赤道儀とカメラしかない構成です。遠征しやすくコンパクトに組んでいます。

- SVBony SV605CC (冷却カメラ)
- Player One Ceres-462M (ガイドカメラ)
- iOptron GEM28 (赤道儀)

{% mermaiddiagram() %}
graph LR
	NotePC["NotePC"] <-->|"有線LAN"| RPi["Raspberry Pi"]
	RPi <-->|"USB"| SV605["SVBony SV605CC<br/>(冷却カメラ)"]
	RPi <-->|"USB"| Ceres["Player One Ceres-462M<br/>(ガイドカメラ)"]
	RPi <-->|"USB"| GEM28["iOptron GEM28<br/>(赤道儀)"]
	Ceres -->|"ST4"| GEM28
{% end %}

{{ image_view(path="image/indiserver02.png", title='この構成での撮影風景') }}

## インストール

Raspberry Pi の OSインストールとSSH接続はできていることとします。  
また、インストールするときだけはインターネットアクセスが必要です。  
運用時は必要ありません。

上の構成ではPCとRaspberry Piを直接LANで繋いでいるので、Raspberry PiのIPアドレスを固定しておく必要があります。

参考: <https://blog.amedama.jp/entry/raspi-os-trixie-static-ip-address>

### indi-server

[indi-server](https://docs.indilib.org/indiserver/)

> INDI サーバー (indiserver) は、INDI ドライバーとクライアント間の通信を管理するスタンドアロン プロセスです。

まずは依存するパッケージをインストールし、本体をビルドします。

```bash
sudo apt update
sudo apt install -y \
  git \
  cdbs \
  dkms \
  cmake \
  ninja-build \
  fxload \
  libev-dev \
  libgps-dev \
  libgsl-dev \
  libraw-dev \
  libusb-dev \
  zlib1g-dev \
  libftdi-dev \
  libjpeg-dev \
  libkrb5-dev \
  libnova-dev \
  libtiff-dev \
  libfftw3-dev \
  librtlsdr-dev \
  libcfitsio-dev \
  libgphoto2-dev \
  build-essential \
  libusb-1.0-0-dev \
  libdc1394-dev \
  libboost-regex-dev \
  libcurl4-gnutls-dev \
  libtheora-dev \
  libxisf-dev \
  liberfa-dev

git clone --depth 1 https://github.com/indilib/indi.git
cd indi
./developer-build.bash
cd build
sudo make install
```

### indi-3rdparty

[indi-3rdparty](https://github.com/indilib/indi-3rdparty)

各メーカー用のINDIドライバをまとめて管理するリポジトリ  
ここから必要なメーカーのドライバをビルドします。

今回は上の構成の通り、SVBonyとPlayerOneのドライバをビルドします。  
(赤道儀は、ここで挙げた構成ではデフォルトのドライバで動作を確認しました)

他のドライバも各フォルダにある`INSTALL`ファイルに、ビルド手順が記載されています。

```bash
sudo apt -y install libnova-dev \
  libcfitsio-dev \
  libftdi-dev \
  libboost-dev \
  liblimesuite-dev \
  libftdi1-dev \
  libavcodec-dev \
  libavdevice-dev \
  libzmq3-dev \
  libudev-dev

git clone --depth=1 https://github.com/indilib/indi-3rdparty
```

#### install libsvbony

```bash
mkdir -p ~/build/libsvbony  && cd ~/build/libsvbony
cmake -DCMAKE_INSTALL_PREFIX=/usr -DCMAKE_BUILD_TYPE=Debug ~/indi-3rdparty/libsvbony
make -j4
sudo make install
```

#### install indi-svbony

```bash
mkdir -p ~/build/indi-svbony && cd ~/build/indi-svbony

cmake -DCMAKE_INSTALL_PREFIX=/usr ~/indi-3rdparty/indi-svbony
make
sudo make install
```

#### install libplayerone

```bash
mkdir -p ~/build/libplayerone && cd ~/build/libplayerone
cmake -DCMAKE_INSTALL_PREFIX=/usr -DCMAKE_BUILD_TYPE=Debug ~/indi-3rdparty/libplayerone
make -j4
sudo make install
```

#### install indi-playerone

```bash
mkdir -p ~/build/indi-playerone && cd ~/build/indi-playerone

cmake -DCMAKE_INSTALL_PREFIX=/usr ~/indi-3rdparty/indi-playerone
make
sudo make install
```

### INDI Web Manager

[INDI Web Manager](https://github.com/knro/indiwebmanager)  
web(ブラウザ) から INDI Server を扱うためのツール  
このマネージャー経由でkstarsからINDI Serverにアクセスする

Raspberry Pi OS (Trixie) からは Pythonのバージョンの問題や pip の問題があり、README通りにインストールできない点に注意

Python3.12以下でないとcgiモジュールがないため、 pyenvでインストールする

```bash
curl -fsSL https://pyenv.run | bash

echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.bashrc
echo '[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(pyenv init - bash)"' >> ~/.bashrc

source ~/.bashrc

sudo apt update
sudo apt install libsqlite3-dev
pyenv install 3.12
```

Trixieではシステム Python への `pip install` が制限されるため、以下のリンクの通り pipenv を使います。
参考: <https://github.com/knro/indiwebmanager/issues/59#issuecomment-2327044696>

```bash
sudo apt install pipenv

mkdir ~/indiweb && cd ~/indiweb
pipenv --python=`which python3.12`
pipenv install indiweb

# 動作チェック
pipenv run indi-web -v
```

### systemd の service file を作成する  

電源投入で indi-web が起動するように、systemd でデーモン化します。

まずはサービスファイルを作成します。  
以下の 2 か所でユーザー名の {user} を必ず置き換えてください。

```bash
cd ~/indiweb
cat << EOF > indiwebmanager.service
[Unit]
Description=INDI Web Manager
After=multi-user.target

[Service]
Type=idle
# MUST SET YOUR USERNAME HERE.
User={user}
WorkingDirectory=/home/{user}/indiweb
ExecStart=/usr/bin/pipenv run indi-web -v
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

サービスファイルを配置して自動起動を設定

```bash
sudo cp indiwebmanager.service /etc/systemd/system/
sudo chmod 644 /etc/systemd/system/indiwebmanager.service

sudo systemctl daemon-reload
sudo systemctl enable indiwebmanager.service
```

ラズパイを再起動して、

```bash
sudo reboot
```

動作を確認してください。

```bash
sudo systemctl status indiwebmanager.service
```

## 動作確認

- [ ] 別のPCからブラウザ経由で、indi-webにアクセスできるか `http://{raspi_ip}:8624`
- [ ] kstars経由でアクセスできるか

### kstarsでの接続設定

Ekos Profile Wizard から設定します。

{{ image_view(path="image/indiserver01.png", title='kstarsのEkosウィザード') }}

1. Next
2. Equipment is attached to a remote device
3. Other
4. Raspberry Pi のIPアドレスを入力。 ポートは `8624`。 INDI Web Manager running on the Remote Computer? は `Yes`
5. 適当な名前をつける。 guider は別にPHD2をPC側にインストールして使うのがおすすめ
6. Select Devices で使用機器を選択する

右の再生ボタンから接続ができます。

## 最後に

この構成でRaspberry Piを鏡筒の上に亀の子で同架してしまえば、LANケーブル一本で絡まる心配もありません。

一般的には統一した望遠鏡制御といえばASCOMが使われますが、Windowsを使わない方法としてはINDIがもっとも使いやすいと思います。  
特にkstarsの統合UIが使いやすいところが非常に気に入っています。


