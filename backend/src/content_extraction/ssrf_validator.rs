// SSRF (Server-Side Request Forgery) Validator
// Prevents fetching from private/internal network addresses

use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use url::Url;

use crate::content_extraction::ContentExtractionError;

/// SSRF Validator - prevents Server-Side Request Forgery attacks
/// 
/// This validator ensures that URLs being fetched do not resolve to
/// private, loopback, link-local, or other internal network addresses.
pub struct SsrfValidator;

impl SsrfValidator {
    /// Validates a URL for SSRF safety
    /// 
    /// Returns Ok(()) if the URL is safe to fetch, or an error if it
    /// resolves to a blocked address.
    pub async fn validate_url(url: &Url) -> Result<(), ContentExtractionError> {
        // Check URL scheme
        let scheme = url.scheme();
        if scheme != "http" && scheme != "https" {
            return Err(ContentExtractionError::SsrfViolation {
                url: url.to_string(),
                reason: format!("Invalid scheme '{}'. Only http and https are allowed.", scheme),
            });
        }

        // Get hostname
        let host = url.host_str().ok_or_else(|| ContentExtractionError::InvalidUrl {
            url: url.to_string(),
        })?;

        // Resolve hostname to IP addresses
        let socket_addrs = match tokio::net::lookup_host((host, 80)).await {
            Ok(addrs) => addrs.collect::<Vec<_>>(),
            Err(e) => {
                return Err(ContentExtractionError::InvalidUrl {
                    url: format!("Failed to resolve hostname '{}': {}", host, e),
                });
            }
        };

        if socket_addrs.is_empty() {
            return Err(ContentExtractionError::InvalidUrl {
                url: format!("Hostname '{}' did not resolve to any IP addresses", host),
            });
        }

        // Validate all resolved IPs are public
        for socket_addr in socket_addrs {
            let ip = socket_addr.ip();
            if !Self::is_public_ip(ip) {
                return Err(ContentExtractionError::SsrfViolation {
                    url: url.to_string(),
                    reason: format!(
                        "Hostname '{}' resolves to blocked IP address: {}",
                        host, ip
                    ),
                });
            }
        }

        Ok(())
    }

    /// Checks if an IP address is public (not private/loopback/etc)
    /// 
    /// Returns true if the IP is safe to fetch from, false if it should be blocked.
    pub fn is_public_ip(ip: IpAddr) -> bool {
        match ip {
            IpAddr::V4(ipv4) => Self::is_public_ipv4(ipv4),
            IpAddr::V6(ipv6) => Self::is_public_ipv6(ipv6),
        }
    }

    /// Checks if an IPv4 address is public
    fn is_public_ipv4(ip: Ipv4Addr) -> bool {
        let octets = ip.octets();

        // Loopback: 127.0.0.0/8
        if octets[0] == 127 {
            return false;
        }

        // Private: 10.0.0.0/8
        if octets[0] == 10 {
            return false;
        }

        // Private: 172.16.0.0/12
        if octets[0] == 172 && (octets[1] >= 16 && octets[1] <= 31) {
            return false;
        }

        // Private: 192.168.0.0/16
        if octets[0] == 192 && octets[1] == 168 {
            return false;
        }

        // Link-local: 169.254.0.0/16
        if octets[0] == 169 && octets[1] == 254 {
            return false;
        }

        // Multicast: 224.0.0.0/4
        if octets[0] >= 224 && octets[0] <= 239 {
            return false;
        }

        // Broadcast: 255.255.255.255
        if ip.is_broadcast() {
            return false;
        }

        // Reserved/documentation ranges
        // 0.0.0.0/8 (current network)
        if octets[0] == 0 {
            return false;
        }

        // 192.0.0.0/24 (IETF protocol assignments)
        if octets[0] == 192 && octets[1] == 0 && octets[2] == 0 {
            return false;
        }

        // 192.0.2.0/24 (TEST-NET-1)
        if octets[0] == 192 && octets[1] == 0 && octets[2] == 2 {
            return false;
        }

        // 198.51.100.0/24 (TEST-NET-2)
        if octets[0] == 198 && octets[1] == 51 && octets[2] == 100 {
            return false;
        }

        // 203.0.113.0/24 (TEST-NET-3)
        if octets[0] == 203 && octets[1] == 0 && octets[2] == 113 {
            return false;
        }

        // 198.18.0.0/15 (benchmarking)
        if octets[0] == 198 && (octets[1] == 18 || octets[1] == 19) {
            return false;
        }

        // 240.0.0.0/4 (reserved for future use)
        if octets[0] >= 240 {
            return false;
        }

        true
    }

    /// Checks if an IPv6 address is public
    fn is_public_ipv6(ip: Ipv6Addr) -> bool {
        // Loopback: ::1
        if ip.is_loopback() {
            return false;
        }

        // Unspecified: ::
        if ip.is_unspecified() {
            return false;
        }

        // Link-local: fe80::/10
        let segments = ip.segments();
        if segments[0] & 0xffc0 == 0xfe80 {
            return false;
        }

        // Unique local: fc00::/7
        if segments[0] & 0xfe00 == 0xfc00 {
            return false;
        }

        // Multicast: ff00::/8
        if ip.is_multicast() {
            return false;
        }

        // IPv4-mapped IPv6: ::ffff:0:0/96
        if ip.to_ipv4_mapped().is_some() {
            // Check if the mapped IPv4 is public
            if let Some(ipv4) = ip.to_ipv4_mapped() {
                return Self::is_public_ipv4(ipv4);
            }
        }

        // Documentation: 2001:db8::/32
        if segments[0] == 0x2001 && segments[1] == 0x0db8 {
            return false;
        }

        true
    }

    /// Validates all URLs in a redirect chain
    /// 
    /// This should be called when following redirects to ensure each
    /// redirect target is also safe.
    pub async fn validate_redirect_chain(urls: &[Url]) -> Result<(), ContentExtractionError> {
        for url in urls {
            Self::validate_url(url).await?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_public_ipv4_loopback() {
        assert!(!SsrfValidator::is_public_ipv4("127.0.0.1".parse().unwrap()));
        assert!(!SsrfValidator::is_public_ipv4("127.1.2.3".parse().unwrap()));
    }

    #[test]
    fn test_is_public_ipv4_private_10() {
        assert!(!SsrfValidator::is_public_ipv4("10.0.0.1".parse().unwrap()));
        assert!(!SsrfValidator::is_public_ipv4("10.255.255.255".parse().unwrap()));
    }

    #[test]
    fn test_is_public_ipv4_private_172() {
        assert!(!SsrfValidator::is_public_ipv4("172.16.0.1".parse().unwrap()));
        assert!(!SsrfValidator::is_public_ipv4("172.31.255.255".parse().unwrap()));
        // 172.15 and 172.32 should be public
        assert!(SsrfValidator::is_public_ipv4("172.15.0.1".parse().unwrap()));
        assert!(SsrfValidator::is_public_ipv4("172.32.0.1".parse().unwrap()));
    }

    #[test]
    fn test_is_public_ipv4_private_192() {
        assert!(!SsrfValidator::is_public_ipv4("192.168.0.1".parse().unwrap()));
        assert!(!SsrfValidator::is_public_ipv4("192.168.255.255".parse().unwrap()));
    }

    #[test]
    fn test_is_public_ipv4_link_local() {
        assert!(!SsrfValidator::is_public_ipv4("169.254.0.1".parse().unwrap()));
        assert!(!SsrfValidator::is_public_ipv4("169.254.255.255".parse().unwrap()));
    }

    #[test]
    fn test_is_public_ipv4_multicast() {
        assert!(!SsrfValidator::is_public_ipv4("224.0.0.1".parse().unwrap()));
        assert!(!SsrfValidator::is_public_ipv4("239.255.255.255".parse().unwrap()));
    }

    #[test]
    fn test_is_public_ipv4_broadcast() {
        assert!(!SsrfValidator::is_public_ipv4("255.255.255.255".parse().unwrap()));
    }

    #[test]
    fn test_is_public_ipv4_public_addresses() {
        assert!(SsrfValidator::is_public_ipv4("8.8.8.8".parse().unwrap()));
        assert!(SsrfValidator::is_public_ipv4("1.1.1.1".parse().unwrap()));
        assert!(SsrfValidator::is_public_ipv4("142.250.185.46".parse().unwrap())); // google.com
    }

    #[test]
    fn test_is_public_ipv6_loopback() {
        assert!(!SsrfValidator::is_public_ipv6("::1".parse().unwrap()));
    }

    #[test]
    fn test_is_public_ipv6_unspecified() {
        assert!(!SsrfValidator::is_public_ipv6("::".parse().unwrap()));
    }

    #[test]
    fn test_is_public_ipv6_link_local() {
        assert!(!SsrfValidator::is_public_ipv6("fe80::1".parse().unwrap()));
        assert!(!SsrfValidator::is_public_ipv6("fe80::dead:beef".parse().unwrap()));
    }

    #[test]
    fn test_is_public_ipv6_unique_local() {
        assert!(!SsrfValidator::is_public_ipv6("fc00::1".parse().unwrap()));
        assert!(!SsrfValidator::is_public_ipv6("fd00::1".parse().unwrap()));
    }

    #[test]
    fn test_is_public_ipv6_multicast() {
        assert!(!SsrfValidator::is_public_ipv6("ff00::1".parse().unwrap()));
        assert!(!SsrfValidator::is_public_ipv6("ff02::1".parse().unwrap()));
    }

    #[test]
    fn test_is_public_ipv6_documentation() {
        assert!(!SsrfValidator::is_public_ipv6("2001:db8::1".parse().unwrap()));
    }

    #[test]
    fn test_is_public_ipv6_public_addresses() {
        assert!(SsrfValidator::is_public_ipv6("2001:4860:4860::8888".parse().unwrap())); // Google DNS
        assert!(SsrfValidator::is_public_ipv6("2606:4700:4700::1111".parse().unwrap())); // Cloudflare DNS
    }

    #[tokio::test]
    async fn test_validate_url_invalid_scheme() {
        let url = Url::parse("ftp://example.com").unwrap();
        let result = SsrfValidator::validate_url(&url).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), ContentExtractionError::SsrfViolation { .. }));
    }

    #[tokio::test]
    async fn test_validate_url_public_domain() {
        let url = Url::parse("https://example.com").unwrap();
        let result = SsrfValidator::validate_url(&url).await;
        // This should succeed as example.com resolves to public IPs
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_validate_url_localhost() {
        let url = Url::parse("http://localhost").unwrap();
        let result = SsrfValidator::validate_url(&url).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), ContentExtractionError::SsrfViolation { .. }));
    }

    #[tokio::test]
    async fn test_validate_url_127_0_0_1() {
        let url = Url::parse("http://127.0.0.1").unwrap();
        let result = SsrfValidator::validate_url(&url).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), ContentExtractionError::SsrfViolation { .. }));
    }

    // Property-based tests
    #[cfg(test)]
    mod proptests {
        use super::*;
        use proptest::prelude::*;

        // Feature: web-content-extraction, Property 1: SSRF Protection Completeness
        // For any URL provided to the system, if the URL resolves to a private IP address
        // (RFC1918, loopback, link-local, or multicast), then the SSRF validator should
        // reject it before any fetch occurs.
        proptest! {
            #![proptest_config(ProptestConfig::with_cases(100))]

            #[test]
            fn prop_private_ipv4_addresses_are_blocked(
                a in 0u8..=255,
                b in 0u8..=255,
                c in 0u8..=255,
                d in 0u8..=255,
            ) {
                let ip = Ipv4Addr::new(a, b, c, d);
                let is_public = SsrfValidator::is_public_ipv4(ip);
                
                // Check if IP should be blocked
                let should_be_blocked = 
                    // Loopback: 127.0.0.0/8
                    a == 127 ||
                    // Private: 10.0.0.0/8
                    a == 10 ||
                    // Private: 172.16.0.0/12
                    (a == 172 && b >= 16 && b <= 31) ||
                    // Private: 192.168.0.0/16
                    (a == 192 && b == 168) ||
                    // Link-local: 169.254.0.0/16
                    (a == 169 && b == 254) ||
                    // Multicast: 224.0.0.0/4
                    (a >= 224 && a <= 239) ||
                    // Broadcast
                    (a == 255 && b == 255 && c == 255 && d == 255) ||
                    // Reserved ranges
                    a == 0 ||
                    (a == 192 && b == 0 && c == 0) ||
                    (a == 192 && b == 0 && c == 2) ||
                    (a == 198 && b == 51 && c == 100) ||
                    (a == 203 && b == 0 && c == 113) ||
                    (a == 198 && (b == 18 || b == 19)) ||
                    a >= 240;
                
                // Property: private IPs should not be public
                if should_be_blocked {
                    prop_assert!(!is_public, "IP {} should be blocked but was marked as public", ip);
                }
            }

            #[test]
            fn prop_ipv6_loopback_and_private_are_blocked(
                seg0 in 0u16..=0xffff,
                seg1 in 0u16..=0xffff,
            ) {
                // Test various IPv6 patterns
                let test_cases = vec![
                    // Link-local: fe80::/10
                    (seg0 & 0xffc0 == 0xfe80, Ipv6Addr::new(seg0, seg1, 0, 0, 0, 0, 0, 1)),
                    // Unique local: fc00::/7
                    (seg0 & 0xfe00 == 0xfc00, Ipv6Addr::new(seg0, seg1, 0, 0, 0, 0, 0, 1)),
                    // Documentation: 2001:db8::/32
                    (seg0 == 0x2001 && seg1 == 0x0db8, Ipv6Addr::new(seg0, seg1, 0, 0, 0, 0, 0, 1)),
                ];

                for (should_be_blocked, ip) in test_cases {
                    let is_public = SsrfValidator::is_public_ipv6(ip);
                    if should_be_blocked {
                        prop_assert!(!is_public, "IPv6 {} should be blocked but was marked as public", ip);
                    }
                }
            }

            #[test]
            fn prop_known_public_ranges_are_allowed(
                // Generate IPs in known public ranges
                a in 1u8..=223u8,
                b in 0u8..=255,
                c in 0u8..=255,
                d in 1u8..=254,
            ) {
                // Skip private ranges
                if a == 10 || a == 127 || (a == 169 && b == 254) ||
                   (a == 172 && b >= 16 && b <= 31) ||
                   (a == 192 && b == 168) ||
                   (a == 192 && b == 0 && c <= 2) ||
                   (a == 198 && b == 51 && c == 100) ||
                   (a == 203 && b == 0 && c == 113) ||
                   (a == 198 && (b == 18 || b == 19)) {
                    return Ok(());
                }

                let ip = Ipv4Addr::new(a, b, c, d);
                let is_public = SsrfValidator::is_public_ipv4(ip);
                
                // Property: IPs outside private ranges should be public
                prop_assert!(is_public, "IP {} should be public but was blocked", ip);
            }
        }
    }
}
