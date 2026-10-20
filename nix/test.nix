# Boots the module behind nginx. Test VMs have no internet access, and the
# service has no network at all (PrivateNetwork), so everything must work
# offline.
{nixosModule}: {
  name = "twitch-multichat";

  nodes.machine = {
    imports = [nixosModule];
    services.twitch-multichat = {
      enable = true;
      origin = "http://multichat.test";
      nginx = {
        enable = true;
        virtualHost = "multichat.test";
      };
    };
  };

  testScript = ''
    import json

    machine.wait_for_unit("twitch-multichat.service")
    machine.wait_for_unit("nginx.service")
    machine.wait_for_open_port(80)

    def curl(path, flags=""):
        return machine.succeed(
            f"curl -fsS {flags} -H 'Host: multichat.test' 'http://localhost{path}'"
        )

    def headers(path):
        return curl(path, "-o /dev/null -D -").lower()

    with subtest("landing page and prerendered files come from nginx"):
        assert "twitch multichat" in curl("/").lower(), curl("/")[:500]
        assert "cache-control: no-cache" in headers("/"), headers("/")
        assert "sitemap" in curl("/robots.txt").lower(), curl("/robots.txt")
        # store files have no real modification time or ETag: a
        # conditional request must get the file, not a 304
        assert "etag" not in headers("/robots.txt"), headers("/robots.txt")
        status = curl("/robots.txt", "-o /dev/null -w '%{http_code}' -H 'If-Modified-Since: Thu, 01 Jan 2099 00:00:00 GMT'")
        assert status == "200", status

    with subtest("hashed assets are immutable"):
        manifest = curl("/_app/version.json")
        assert "version" in json.loads(manifest)
        immutable = machine.succeed(
            "curl -fsS -H 'Host: multichat.test' http://localhost/ "
            "| grep -o '/_app/immutable/[^\"]*\\.js' | head -1"
        ).strip()
        assert "immutable" in headers(immutable), immutable

    with subtest("chat pages are rendered by the app with absolute URLs"):
        page = curl("/-/foo/bar")
        assert "http://multichat.test/images/preview.png?channel=foo&amp;channel=bar" in page, page
        assert "cache-control: no-cache" in headers("/-/foo/bar")

    with subtest("a spoofed Host header doesn't reach the page"):
        page = machine.succeed("curl -fsS -H 'Host: evil.test' http://localhost/-/foo")
        assert "evil.test" not in page, page
        assert "http://multichat.test/images/preview.png?channel=foo" in page, page

    with subtest("preview images render offline, same as the snapshot"):
        curl("/images/preview.png?channel=foo&channel=bar", "-o /tmp/preview.png")
        machine.succeed(
            "cmp /tmp/preview.png ${../src/routes/images/preview.png/__snapshots__/two-channels.png}"
        )

    with subtest("unknown routes are 404"):
        machine.fail("curl -fsS -H 'Host: multichat.test' http://localhost/nope")

    with subtest("hardening"):
        print(machine.succeed("systemd-analyze security twitch-multichat.service | tail -1"))
        # 0-100, the exposure level shown times ten: at most 1.0 (0.2 today)
        machine.succeed("systemd-analyze security --threshold=10 twitch-multichat.service")
  '';
}
