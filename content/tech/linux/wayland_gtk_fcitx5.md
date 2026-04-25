+++
title = "Arch Linux + KDE Plasma Wayland で fcitx5 の日本語入力を整える"
date = 2026-04-25

[taxonomies]
tags = ["archliunx", "KDE"]
+++

<!-- markdownlint-disable MD025 -->
# Arch Linux + KDE Plasma Wayland で fcitx5 の日本語入力を整える

Arch Linux + KDE Plasma Wayland で fcitx5 の日本語入力を整えます。

GUIセッション用に環境変数を定義できていなかったので、一部のGTKアプリでIMEが聞かないことがありましたので、備忘録として。

1. fcitx5 + mozc の導入
2. Plasma 側で Fcitx5 を仮想キーボードに設定
3. 必要な環境変数を GUI セッションへ渡す

## 日本語ロケールとフォントを用意

以下でロケールを設定します。

```bash
sudo sed -i 's/^#ja_JP.UTF-8 UTF-8/ja_JP.UTF-8 UTF-8/' /etc/locale.gen
sudo locale-gen
sudo localectl set-locale LANG=ja_JP.UTF-8
```

その後、インストールされていなければフォントも導入します。Notoが一番手っ取り早いです。

```bash
sudo pacman -S noto-fonts-cjk
```

## fcitx5 一式をインストール

fcitx5 のインストール

```bash
sudo pacman -S fcitx5-im fcitx5-mozc
```

fcitx5-imには、だいたい必要なパッケージが含まれています。

- fcitx5
  - Fcitx 5 本体。入力メソッドフレームワーク
- fcitx5-configtool
  - Fcitx 5 の設定ツール。KDE の設定モジュール
- fcitx5-gtk
  - GTK アプリ向けの入力メソッド連携モジュール
- fcitx5-qt
  - Qt5/Qt6 アプリ向けの入力メソッド連携モジュール

## GUI セッション用の環境変数を永続化

~/.config/environment.d/99-input-method.conf を作成:

```conf
GTK_IM_MODULE=fcitx
QT_IM_MODULE=fcitx
SDL_IM_MODULE=fcitx
XMODIFIERS=@im=fcitx
```

再起動せず反映させるときは以下のコマンドを実行します。

```bash
systemctl --user import-environment GTK_IM_MODULE QT_IM_MODULE SDL_IM_MODULE XMODIFIERS
dbus-update-activation-environment --systemd GTK_IM_MODULE QT_IM_MODULE SDL_IM_MODULE XMODIFIERS
```

## Plasma Wayland で Fcitx 5 を使う設定にする

KDE の システム設定 → キーボード → 仮想キーボード で Fcitx 5 を選びます。

{{ image_view(path="image/kde_settings_fcitx.png", title='KDEシステム設定の仮想キーボード画面') }}

入力メソッド 設定画面を開き、入力メソッドに Mozc を追加します。

{{ image_view(path="image/kde_settings_mozc.png", title='KDEシステム設定の入力メソッド画面') }}

切り替えのホットキーは 入力メソッド → グローバルオプションを設定  
切り替えキーは Ctrl+Space か Super+Space に設定していますが、お好みで設定してください。

{{ image_view(path="image/kde_settings_hotkey.png", title='KDEシステム設定のグローバルオプションの設定画面') }}

## 一度ログアウト/ログイン

Wayland セッションと GUI アプリに確実に反映させるため、再ログインしてください。
GTK アプリは完全終了してから再起動が必要です。

## 確認

Firefox, kosole などで日本語入力を確認します。
