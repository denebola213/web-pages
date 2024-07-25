+++
title = "pacman -Syu で証明書エラーが出たときにすること"
date = 2024-07-25

[taxonomies]
tags = ["archliunx", "pacman"]
+++

# pacman -Syu で証明書エラーが出たときにすること

自分用のメモ

久しぶりに起動したPCで、パッケージを更新すると、

```sh
$ sudo pacman -Syu
...
libinstpatch: "Brett Cornwall <brett@i--b.com>" の署名は信頼されていません
```

のような証明書系のエラーが発生することがある。

その際は証明書の更新を`archlinux-keyring`の再インストールで行う。

```sh
sudo pacman -S archlinux-keyring
```
