-- Form host artık primary değil; aktif reklam domaini primary
update site_domains set is_primary = false where hostname = 'yapikredi.online';
update site_domains set is_primary = true where hostname = 'kredifirsatlari.org' and status = 'active';

-- CF phishing block: failover zincirinde kullanılmaz
delete from site_domains where hostname in ('kredibasvuru.org', 'www.kredibasvuru.org');
