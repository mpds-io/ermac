MPDS: GUI client & static HTML environment
==========

[mpds:data](https://bitbucket.org/evgeny-blokhin/mpdsdata) ([issues](https://bitbucket.org/evgeny-blokhin/mpdsdata/issues?status=new&status=open)) | [mpds:lib](https://bitbucket.org/evgeny-blokhin/mpdslib) | [mpds:node](https://bitbucket.org/evgeny-blokhin/mpdsnode) ([issues](https://bitbucket.org/evgeny-blokhin/mpdsnode/issues?status=new&status=open)) | [mpds:gui](https://bitbucket.org/evgeny-blokhin/mpdsgui) ([issues](https://bitbucket.org/evgeny-blokhin/mpdsgui/issues?status=new&status=open))

For development an arbitrary web-server is required, e.g.:
```
cd html && php -S localhost:8070
```

Production server must be *nginx* > 1.9.5 (OpenSSL > 1.0.2). In production, the backend may be only visible in an internal network (Scaleway), so a proxy is required:
```
g++ -o third_party/socks5 third_party/socks5.cpp -lpthread -fpermissive
nohup /data/third_party/socks5 & # must auto-start
```