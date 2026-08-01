BEGIN;

INSERT INTO legal_sources (
  document_number, title, official_url, official_host, issued_at,
  effective_from, status, created_by, last_verified_at, verified_by
)
SELECT '168/2024/NĐ-CP', 'Nghị định 168/2024/NĐ-CP quy định xử phạt vi phạm hành chính về trật tự, an toàn giao thông trong lĩnh vực giao thông đường bộ; trừ điểm, phục hồi điểm giấy phép lái xe', 'https://vanban.chinhphu.vn/?pageid=27160&docid=212167',
  'vanban.chinhphu.vn', '2024-12-26', '2025-01-01', 'in_force',
  'seed-editor', '2026-07-31T16:15:09.126Z', 'seed-reviewer'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_sources WHERE document_number = '168/2024/NĐ-CP'
);

INSERT INTO legal_sources (
  document_number, title, official_url, official_host, issued_at,
  effective_from, status, created_by, last_verified_at, verified_by
)
SELECT '174/2026/NĐ-CP', 'Nghị định 174/2026/NĐ-CP quy định xử phạt vi phạm hành chính trong lĩnh vực bưu chính, viễn thông, tần số vô tuyến điện, giao dịch điện tử và công nghệ thông tin', 'https://vanban.chinhphu.vn/?classid=1&docid=218185&pageid=27160&typegroupid=4',
  'vanban.chinhphu.vn', '2026-05-15', '2026-07-01', 'in_force',
  'seed-editor', '2026-07-31T16:15:09.126Z', 'seed-reviewer'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_sources WHERE document_number = '174/2026/NĐ-CP'
);

INSERT INTO legal_sources (
  document_number, title, official_url, official_host, issued_at,
  effective_from, status, created_by, last_verified_at, verified_by
)
SELECT '91/2015/QH13', 'Bộ luật Dân sự năm 2015', 'https://vanban.chinhphu.vn/?pageid=27160&docid=183188&classid=1&typegroupid=3',
  'vanban.chinhphu.vn', '2015-11-24', '2017-01-01', 'in_force',
  'seed-editor', '2026-07-31T16:15:09.126Z', 'seed-reviewer'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_sources WHERE document_number = '91/2015/QH13'
);

INSERT INTO legal_sources (
  document_number, title, official_url, official_host, issued_at,
  effective_from, status, created_by, last_verified_at, verified_by
)
SELECT '24/2018/QH14', 'Luật An ninh mạng năm 2018', 'https://vanban.chinhphu.vn/?pageid=27160&docid=206114',
  'vanban.chinhphu.vn', '2018-06-12', '2019-01-01', 'in_force',
  'seed-editor', '2026-07-31T16:15:09.126Z', 'seed-reviewer'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_sources WHERE document_number = '24/2018/QH14'
);

INSERT INTO legal_sources (
  document_number, title, official_url, official_host, issued_at,
  effective_from, status, created_by, last_verified_at, verified_by
)
SELECT '155/VBHN-VPQH', 'Văn bản hợp nhất 155/VBHN-VPQH — Luật Sở hữu trí tuệ (hợp nhất các sửa đổi, bổ sung đến năm 2025)', 'https://vanban.chinhphu.vn/?pageid=27160&docid=215309',
  'vanban.chinhphu.vn', '2025-09-09', '2006-07-01', 'in_force',
  'seed-editor', '2026-07-31T16:15:09.126Z', 'seed-reviewer'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_sources WHERE document_number = '155/VBHN-VPQH'
);

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '7', '2',
  'h', '2. Phạt tiền từ 400.000 đồng đến 600.000 đồng đối với người điều khiển xe thực hiện một trong các hành vi vi phạm sau đây: ... h) Không đội "mũ bảo hiểm cho người đi mô tô, xe máy" hoặc đội "mũ bảo hiểm cho người đi mô tô, xe máy" không cài quai đúng quy cách khi điều khiển xe tham gia giao thông trên đường bộ; i) Chở người ngồi trên xe không đội "mũ bảo hiểm cho người đi mô tô, xe máy" hoặc đội "mũ bảo hiểm cho người đi mô tô, xe máy" không cài quai đúng quy cách, trừ trường hợp chở người bệnh đi cấp cứu, trẻ em dưới 06 tuổi, áp giải người có hành vi vi phạm pháp luật;',
  'Người lái xe máy và người ngồi sau đều phải đội mũ bảo hiểm và cài quai đúng cách. Không đội, hoặc đội mà không cài quai, bị phạt 400.000-600.000 đồng; chở người không đội mũ cũng bị phạt như vậy.', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-giao-thong-mu-bao-hiem-v1',
  'provision-sha256-v1', '5b5951b87c93a47d1f50e5ec79e9dc8ee42a3f84e0f850b44f55562d3f4de277', 'in_force',
  '2025-01-01'
FROM legal_sources s
WHERE s.document_number = '168/2024/NĐ-CP'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-giao-thong-mu-bao-hiem-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Giao thông', '◉', 'Không đội mũ bảo hiểm khi đi xe máy',
  'Điểm h, i khoản 2 Điều 7 Nghị định 168/2024/NĐ-CP', 'Phạt tiền từ 400.000 đến 600.000 đồng với người điều khiển xe không đội mũ bảo hiểm hoặc đội mà không cài quai đúng quy cách; chở người ngồi sau không đội mũ cũng bị phạt cùng mức. Người từ đủ 14 đến dưới 16 tuổi không bị phạt tiền; từ đủ 16 đến dưới 18 tuổi mức tiền phạt không quá một nửa mức của người thành niên.', 'Luôn đội mũ bảo hiểm đạt chuẩn và cài quai đúng cách cho cả người lái lẫn người ngồi sau, kể cả khi đi quãng đường ngắn.',
  'Nam 16 tuổi chở bạn đi học, cả hai đều không đội mũ bảo hiểm. Cả hành vi tự mình không đội và hành vi chở người không đội đều có thể bị xử phạt.', '["giao-thong","mu-bao-hiem","xe-may"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Giao thông' AND title = 'Không đội mũ bảo hiểm khi đi xe máy'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-giao-thong-mu-bao-hiem-v1',
  'provision-sha256-v1', '5b5951b87c93a47d1f50e5ec79e9dc8ee42a3f84e0f850b44f55562d3f4de277'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Giao thông' AND e.title = 'Không đội mũ bảo hiểm khi đi xe máy'
  AND p.revision_id = 'seed-giao-thong-mu-bao-hiem-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '7', '7',
  'c', '7. Phạt tiền từ 4.000.000 đồng đến 6.000.000 đồng đối với người điều khiển xe thực hiện một trong các hành vi vi phạm sau đây: ... c) Không chấp hành hiệu lệnh của đèn tín hiệu giao thông;',
  'Đi xe máy vượt đèn đỏ (không chấp hành đèn tín hiệu) bị phạt 4-6 triệu đồng — mức phạt đã tăng mạnh từ 01/01/2025.', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-giao-thong-vuot-den-do-v1',
  'provision-sha256-v1', '62562be268e6e3d486ca312588a1bda914a6f0ef95991573cbd55a6c2526df78', 'in_force',
  '2025-01-01'
FROM legal_sources s
WHERE s.document_number = '168/2024/NĐ-CP'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-giao-thong-vuot-den-do-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Giao thông', '✕', 'Vượt đèn đỏ',
  'Điểm c khoản 7 Điều 7 Nghị định 168/2024/NĐ-CP', 'Phạt tiền từ 4.000.000 đến 6.000.000 đồng với người đi xe máy không chấp hành hiệu lệnh của đèn tín hiệu giao thông. Người từ đủ 14 đến dưới 16 tuổi không bị phạt tiền; từ đủ 16 đến dưới 18 tuổi mức tiền phạt không quá một nửa mức của người thành niên.', 'Dừng hẳn trước vạch khi đèn đỏ, kể cả khi đường vắng; đèn vàng cũng phải giảm tốc độ và dừng nếu chưa qua vạch.',
  'Bạn học sinh đi xe máy điện thấy đường vắng nên vượt đèn đỏ lúc sáng sớm. Hành vi này bị phạt rất nặng theo mức mới từ 2025, dù không gây tai nạn.', '["giao-thong","den-do","tin-hieu"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Giao thông' AND title = 'Vượt đèn đỏ'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-giao-thong-vuot-den-do-v1',
  'provision-sha256-v1', '62562be268e6e3d486ca312588a1bda914a6f0ef95991573cbd55a6c2526df78'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Giao thông' AND e.title = 'Vượt đèn đỏ'
  AND p.revision_id = 'seed-giao-thong-vuot-den-do-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '7', '2',
  'g', '2. Phạt tiền từ 400.000 đồng đến 600.000 đồng đối với người điều khiển xe thực hiện một trong các hành vi vi phạm sau đây: ... g) Chở theo 02 người trên xe, trừ trường hợp chở người bệnh đi cấp cứu, trẻ em dưới 12 tuổi, người già yếu hoặc người khuyết tật, áp giải người có hành vi vi phạm pháp luật;',
  'Xe máy chở thêm 2 người bị phạt 400.000-600.000 đồng (trừ trường hợp cấp cứu, trẻ dưới 12 tuổi, người già yếu, khuyết tật). Chở từ 3 người trở lên mức phạt cao hơn.', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-giao-thong-cho-qua-nguoi-v1',
  'provision-sha256-v1', 'bd43bedcaf06aa0da6abf73f8667f8cef48a733499e2fd1ddd8fbd74bec662ce', 'in_force',
  '2025-01-01'
FROM legal_sources s
WHERE s.document_number = '168/2024/NĐ-CP'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-giao-thong-cho-qua-nguoi-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Giao thông', '▲', 'Chở quá số người quy định',
  'Điểm g khoản 2, điểm b khoản 3 Điều 7 Nghị định 168/2024/NĐ-CP', 'Chở theo 2 người trên xe: phạt 400.000-600.000 đồng (trừ chở người bệnh đi cấp cứu, trẻ em dưới 12 tuổi, người già yếu, người khuyết tật). Chở theo từ 3 người trở lên: phạt 600.000-800.000 đồng. Người từ đủ 14 đến dưới 16 tuổi không bị phạt tiền; từ đủ 16 đến dưới 18 tuổi mức tiền phạt không quá một nửa mức của người thành niên.', 'Xe máy chỉ chở tối đa một người ngồi sau; đừng ''kẹp ba'' dù quãng đường ngắn hay có quen biết nhau.',
  'Ba bạn cùng lớp ''kẹp ba'' trên một chiếc xe máy điện đi chơi cuối tuần. Người cầm lái bị xử phạt về hành vi chở quá số người, chưa kể nguy cơ tai nạn cao hơn hẳn.', '["giao-thong","cho-qua-nguoi","xe-may"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Giao thông' AND title = 'Chở quá số người quy định'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-giao-thong-cho-qua-nguoi-v1',
  'provision-sha256-v1', 'bd43bedcaf06aa0da6abf73f8667f8cef48a733499e2fd1ddd8fbd74bec662ce'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Giao thông' AND e.title = 'Chở quá số người quy định'
  AND p.revision_id = 'seed-giao-thong-cho-qua-nguoi-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '7', '7',
  'a', '7. Phạt tiền từ 4.000.000 đồng đến 6.000.000 đồng đối với người điều khiển xe thực hiện một trong các hành vi vi phạm sau đây: a) Đi ngược chiều của đường một chiều, đi ngược chiều trên đường có biển "Cấm đi ngược chiều", trừ hành vi vi phạm quy định tại điểm b khoản này và các trường hợp xe ưu tiên đang đi làm nhiệm vụ khẩn cấp theo quy định; điều khiển xe đi trên vỉa hè, trừ trường hợp điều khiển xe đi qua vỉa hè để vào nhà, cơ quan;',
  'Đi xe máy ngược chiều đường một chiều hoặc nơi có biển cấm đi ngược chiều bị phạt 4-6 triệu đồng.', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-giao-thong-nguoc-chieu-v1',
  'provision-sha256-v1', 'd432d2edeafcd74d18b3919cba2ab4411920bbfa6e62ddc39a281d8081517757', 'in_force',
  '2025-01-01'
FROM legal_sources s
WHERE s.document_number = '168/2024/NĐ-CP'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-giao-thong-nguoc-chieu-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Giao thông', '↺', 'Đi ngược chiều đường một chiều',
  'Điểm a khoản 7 Điều 7 Nghị định 168/2024/NĐ-CP', 'Phạt tiền từ 4.000.000 đến 6.000.000 đồng với người đi xe máy ngược chiều của đường một chiều hoặc trên đường có biển ''Cấm đi ngược chiều''. Người từ đủ 14 đến dưới 16 tuổi không bị phạt tiền; từ đủ 16 đến dưới 18 tuổi mức tiền phạt không quá một nửa mức của người thành niên.', 'Đi đúng chiều đường kể cả khi phải vòng xa hơn; chú ý biển ''Cấm đi ngược chiều'' ở đầu các tuyến một chiều.',
  'Để tiết kiệm vài trăm mét, một bạn đi xe máy ngược chiều đoạn đường một chiều gần trường. Mức phạt 4-6 triệu đồng cao gấp nhiều lần ''quãng đường tiết kiệm được''.', '["giao-thong","nguoc-chieu"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Giao thông' AND title = 'Đi ngược chiều đường một chiều'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-giao-thong-nguoc-chieu-v1',
  'provision-sha256-v1', 'd432d2edeafcd74d18b3919cba2ab4411920bbfa6e62ddc39a281d8081517757'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Giao thông' AND e.title = 'Đi ngược chiều đường một chiều'
  AND p.revision_id = 'seed-giao-thong-nguoc-chieu-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '7', '4',
  'đ', '4. Phạt tiền từ 800.000 đồng đến 1.000.000 đồng đối với người điều khiển xe thực hiện một trong các hành vi vi phạm sau đây: ... đ) Người đang điều khiển xe sử dụng ô (dù), thiết bị âm thanh (trừ thiết bị trợ thính), dùng tay cầm và sử dụng điện thoại hoặc các thiết bị điện tử khác.',
  'Vừa lái xe máy vừa cầm điện thoại (hoặc che ô, đeo tai nghe) bị phạt 800.000-1.000.000 đồng.', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-giao-thong-dien-thoai-v1',
  'provision-sha256-v1', '1b01bb440a6db68858661559b5b1bf42d240fe9389c3be5abe31673049e77787', 'in_force',
  '2025-01-01'
FROM legal_sources s
WHERE s.document_number = '168/2024/NĐ-CP'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-giao-thong-dien-thoai-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Giao thông', '☎', 'Dùng điện thoại khi đang lái xe',
  'Điểm đ khoản 4 Điều 7 Nghị định 168/2024/NĐ-CP', 'Phạt tiền từ 800.000 đến 1.000.000 đồng với người đang điều khiển xe máy mà dùng tay cầm và sử dụng điện thoại hoặc thiết bị điện tử khác. Người từ đủ 14 đến dưới 16 tuổi không bị phạt tiền; từ đủ 16 đến dưới 18 tuổi mức tiền phạt không quá một nửa mức của người thành niên.', 'Cần nghe gọi hay xem bản đồ thì dừng xe ở nơi an toàn trước; tuyệt đối không vừa lái vừa nhắn tin.',
  'Một bạn vừa lái xe máy điện vừa xem tin nhắn, loạng choạng suýt va vào người đi bộ. Ngoài mức phạt tiền, đây là nguyên nhân tai nạn rất phổ biến ở tuổi học sinh.', '["giao-thong","dien-thoai","xe-may"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Giao thông' AND title = 'Dùng điện thoại khi đang lái xe'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-giao-thong-dien-thoai-v1',
  'provision-sha256-v1', '1b01bb440a6db68858661559b5b1bf42d240fe9389c3be5abe31673049e77787'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Giao thông' AND e.title = 'Dùng điện thoại khi đang lái xe'
  AND p.revision_id = 'seed-giao-thong-dien-thoai-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '14', '1',
  'a', '1. Phạt tiền từ 400.000 đồng đến 600.000 đồng đối với một trong các hành vi vi phạm sau đây: a) Điều khiển xe không có còi; đèn soi biển số; đèn báo hãm; gương chiếu hậu bên trái người điều khiển hoặc có nhưng không có tác dụng;',
  'Xe máy phải có gương chiếu hậu bên trái còn dùng được; thiếu hoặc gương hỏng bị phạt 400.000-600.000 đồng.', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-giao-thong-guong-hau-v1',
  'provision-sha256-v1', 'f8b3f7931d9bc73cbc84a5be31160300c40ea73b987781eb491d84d950abc8d2', 'in_force',
  '2025-01-01'
FROM legal_sources s
WHERE s.document_number = '168/2024/NĐ-CP'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-giao-thong-guong-hau-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Giao thông', '◐', 'Không có gương chiếu hậu',
  'Điểm a khoản 1 Điều 14 Nghị định 168/2024/NĐ-CP', 'Phạt tiền từ 400.000 đến 600.000 đồng nếu xe máy không có gương chiếu hậu bên trái người điều khiển hoặc có nhưng không có tác dụng. Người từ đủ 14 đến dưới 16 tuổi không bị phạt tiền; từ đủ 16 đến dưới 18 tuổi mức tiền phạt không quá một nửa mức của người thành niên.', 'Lắp và giữ nguyên gương chiếu hậu (tối thiểu bên trái) đúng tiêu chuẩn; đừng tháo gương vì ''cho đẹp''.',
  'Một bạn tháo cả hai gương xe máy điện cho ''gọn''. Khi bị kiểm tra, hành vi thiếu gương bên trái đã đủ để bị xử phạt, chưa kể điểm mù khiến chuyển làn rất nguy hiểm.', '["giao-thong","guong","xe-may"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Giao thông' AND title = 'Không có gương chiếu hậu'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-giao-thong-guong-hau-v1',
  'provision-sha256-v1', 'f8b3f7931d9bc73cbc84a5be31160300c40ea73b987781eb491d84d950abc8d2'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Giao thông' AND e.title = 'Không có gương chiếu hậu'
  AND p.revision_id = 'seed-giao-thong-guong-hau-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '18', '4',
  'a', '1. Phạt cảnh cáo người từ đủ 14 tuổi đến dưới 16 tuổi điều khiển xe mô tô, xe gắn máy, các loại xe tương tự xe mô tô và các loại xe tương tự xe gắn máy hoặc điều khiển xe ô tô, điều khiển xe chở người bốn bánh có gắn động cơ, xe chở hàng bốn bánh có gắn động cơ và các loại xe tương tự xe ô tô. ... 4. Phạt tiền từ 400.000 đồng đến 600.000 đồng đối với một trong các hành vi vi phạm sau đây: a) Người từ đủ 16 tuổi đến dưới 18 tuổi điều khiển xe mô tô có dung tích xi-lanh từ 50 cm3 trở lên hoặc có công suất động cơ điện từ 04 kW trở lên;',
  '14-16 tuổi lái xe máy: bị cảnh cáo. 16-18 tuổi lái mô tô từ 50 cm³ (hoặc xe điện từ 4 kW) trở lên: phạt 400.000-600.000 đồng. Chỉ đủ 18 tuổi, có giấy phép, mới được lái mô tô.', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-giao-thong-chua-du-tuoi-v1',
  'provision-sha256-v1', 'f745cd283474e11b6700ca2a1f2a0378a7debdd463c884554f144510cff8052d', 'in_force',
  '2025-01-01'
FROM legal_sources s
WHERE s.document_number = '168/2024/NĐ-CP'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-giao-thong-chua-du-tuoi-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Giao thông', '⚠', 'Chưa đủ tuổi điều khiển xe máy',
  'Khoản 1, điểm a khoản 4 Điều 18 Nghị định 168/2024/NĐ-CP', 'Người từ đủ 14 đến dưới 16 tuổi điều khiển xe mô tô, xe gắn máy: phạt cảnh cáo. Người từ đủ 16 đến dưới 18 tuổi điều khiển xe mô tô từ 50 cm³ (hoặc động cơ điện từ 4 kW) trở lên: phạt tiền 400.000-600.000 đồng. Người giao xe cho người chưa đủ điều kiện cũng bị xử phạt riêng.', 'Dưới 16 tuổi chỉ dùng xe đạp, xe đạp điện; đủ 16 tuổi mới được đi xe gắn máy dưới 50 cm³; đủ 18 tuổi và có giấy phép lái xe mới được đi mô tô từ 50 cm³ trở lên.',
  'Phụ huynh giao xe tay ga 110cc cho con 16 tuổi đi học. Con bị phạt tiền vì chưa đủ tuổi với loại xe này, còn người giao xe cũng bị xử phạt về hành vi giao xe cho người chưa đủ điều kiện.', '["giao-thong","do-tuoi","hoc-sinh"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Giao thông' AND title = 'Chưa đủ tuổi điều khiển xe máy'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-giao-thong-chua-du-tuoi-v1',
  'provision-sha256-v1', 'f745cd283474e11b6700ca2a1f2a0378a7debdd463c884554f144510cff8052d'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Giao thông' AND e.title = 'Chưa đủ tuổi điều khiển xe máy'
  AND p.revision_id = 'seed-giao-thong-chua-du-tuoi-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '7', '7',
  'a', '7. Phạt tiền từ 4.000.000 đồng đến 6.000.000 đồng đối với người điều khiển xe thực hiện một trong các hành vi vi phạm sau đây: a) Đi ngược chiều của đường một chiều, đi ngược chiều trên đường có biển "Cấm đi ngược chiều", trừ hành vi vi phạm quy định tại điểm b khoản này và các trường hợp xe ưu tiên đang đi làm nhiệm vụ khẩn cấp theo quy định; điều khiển xe đi trên vỉa hè, trừ trường hợp điều khiển xe đi qua vỉa hè để vào nhà, cơ quan;',
  'Chạy xe máy trên vỉa hè (không phải để rẽ vào nhà, cơ quan) bị phạt 4-6 triệu đồng.', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-giao-thong-via-he-v1',
  'provision-sha256-v1', 'cb47ecc978099dc89816fb0e74dd6e3f20ade0fda47d6eecce1931c3220809f0', 'in_force',
  '2025-01-01'
FROM legal_sources s
WHERE s.document_number = '168/2024/NĐ-CP'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-giao-thong-via-he-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Giao thông', '▦', 'Chạy xe máy trên vỉa hè',
  'Điểm a khoản 7 Điều 7 Nghị định 168/2024/NĐ-CP', 'Phạt tiền từ 4.000.000 đến 6.000.000 đồng với người điều khiển xe máy đi trên vỉa hè (trừ trường hợp đi qua vỉa hè để vào nhà, cơ quan). Người từ đủ 14 đến dưới 16 tuổi không bị phạt tiền; từ đủ 16 đến dưới 18 tuổi mức tiền phạt không quá một nửa mức của người thành niên.', 'Kẹt xe cũng phải đi dưới lòng đường đúng làn; vỉa hè là của người đi bộ.',
  'Giờ tan học đường đông, một bạn leo xe máy điện lên vỉa hè để vượt. Từ 2025 hành vi này bị phạt tới 4-6 triệu đồng vì gây nguy hiểm trực tiếp cho người đi bộ.', '["giao-thong","via-he"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Giao thông' AND title = 'Chạy xe máy trên vỉa hè'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-giao-thong-via-he-v1',
  'provision-sha256-v1', 'cb47ecc978099dc89816fb0e74dd6e3f20ade0fda47d6eecce1931c3220809f0'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Giao thông' AND e.title = 'Chạy xe máy trên vỉa hè'
  AND p.revision_id = 'seed-giao-thong-via-he-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '7', '9',
  'a', '9. Phạt tiền từ 8.000.000 đồng đến 10.000.000 đồng đối với người điều khiển xe thực hiện một trong các hành vi vi phạm sau đây: a) Điều khiển xe lạng lách, đánh võng trên đường bộ; sử dụng chân chống hoặc vật khác quệt xuống đường khi xe đang chạy;',
  'Lạng lách, đánh võng bằng xe máy bị phạt 8-10 triệu đồng; đây là một trong các mức phạt nặng nhất với xe máy.', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-giao-thong-lang-lach-v1',
  'provision-sha256-v1', '8dfeb05aa7150ec00b79b074fb5a767d4c6c42800f0ece799af05be7a212ad37', 'in_force',
  '2025-01-01'
FROM legal_sources s
WHERE s.document_number = '168/2024/NĐ-CP'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-giao-thong-lang-lach-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Giao thông', '∿', 'Lạng lách, đánh võng',
  'Điểm a khoản 9 Điều 7 Nghị định 168/2024/NĐ-CP', 'Phạt tiền từ 8.000.000 đến 10.000.000 đồng với người điều khiển xe máy lạng lách, đánh võng trên đường bộ. Gây tai nạn hoặc tái phạm còn bị xử lý nặng hơn theo các khoản khác của Điều 7. Người từ đủ 14 đến dưới 16 tuổi không bị phạt tiền; từ đủ 16 đến dưới 18 tuổi mức tiền phạt không quá một nửa mức của người thành niên.', 'Không ''biểu diễn'', không kéo ga bốc đầu, không tham gia đoàn xe rú ga lạng lách — kể cả chỉ để quay video.',
  'Một nhóm bạn rủ nhau lạng lách quay clip đăng mạng. Ngoài mức phạt tiền rất cao, clip tự đăng chính là bằng chứng để cơ quan chức năng xử lý.', '["giao-thong","lang-lach","dua-xe"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Giao thông' AND title = 'Lạng lách, đánh võng'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-giao-thong-lang-lach-v1',
  'provision-sha256-v1', '8dfeb05aa7150ec00b79b074fb5a767d4c6c42800f0ece799af05be7a212ad37'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Giao thông' AND e.title = 'Lạng lách, đánh võng'
  AND p.revision_id = 'seed-giao-thong-lang-lach-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '95', '1',
  'a', '1. Phạt tiền từ 20.000.000 đồng đến 30.000.000 đồng đối với hành vi lợi dụng mạng xã hội để thực hiện một trong các hành vi sau: a) Cung cấp, chia sẻ thông tin giả mạo, thông tin sai sự thật, xuyên tạc, vu khống, xúc phạm uy tín của cơ quan, tổ chức, danh dự, nhân phẩm của cá nhân;',
  'Đăng hoặc chia sẻ lại tin giả, tin sai sự thật trên mạng xã hội bị phạt tiền (cá nhân 10-15 triệu đồng) và buộc gỡ bài. Chia sẻ lại cũng tính là vi phạm.', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-mang-xa-hoi-tin-sai-v1',
  'provision-sha256-v1', 'efa07536aba762288135cb7c9fd779e099f536c310ba0b6ef114e0ba99cf1196', 'in_force',
  '2026-07-01'
FROM legal_sources s
WHERE s.document_number = '174/2026/NĐ-CP'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-mang-xa-hoi-tin-sai-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Mạng xã hội', '⚑', 'Đăng, chia sẻ tin sai sự thật',
  'Điểm a khoản 1 Điều 95 Nghị định 174/2026/NĐ-CP', 'Phạt tiền từ 20.000.000 đến 30.000.000 đồng với hành vi lợi dụng mạng xã hội để cung cấp, chia sẻ thông tin giả mạo, sai sự thật. Mức phạt nêu trên áp dụng với tổ chức; cá nhân vi phạm bị phạt bằng một nửa (Điều 4 Nghị định 174/2026/NĐ-CP). Ngoài phạt tiền còn buộc gỡ bỏ thông tin.', 'Kiểm tra nguồn trước khi bấm chia sẻ; nếu lỡ đăng thì gỡ ngay, đính chính và xin lỗi người bị ảnh hưởng.',
  'Một bạn chia sẻ lại bài ''trường X cho nghỉ học'' do người khác bịa. Dù không phải người viết đầu tiên, hành vi chia sẻ vẫn là ''cung cấp, chia sẻ thông tin sai sự thật'' và có thể bị xử phạt.', '["mang-xa-hoi","tin-gia","chia-se"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Mạng xã hội' AND title = 'Đăng, chia sẻ tin sai sự thật'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-mang-xa-hoi-tin-sai-v1',
  'provision-sha256-v1', 'efa07536aba762288135cb7c9fd779e099f536c310ba0b6ef114e0ba99cf1196'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Mạng xã hội' AND e.title = 'Đăng, chia sẻ tin sai sự thật'
  AND p.revision_id = 'seed-mang-xa-hoi-tin-sai-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '95', '1',
  'a', '1. Phạt tiền từ 20.000.000 đồng đến 30.000.000 đồng đối với hành vi lợi dụng mạng xã hội để thực hiện một trong các hành vi sau: a) Cung cấp, chia sẻ thông tin giả mạo, thông tin sai sự thật, xuyên tạc, vu khống, xúc phạm uy tín của cơ quan, tổ chức, danh dự, nhân phẩm của cá nhân;',
  'Dùng mạng xã hội để vu khống, xúc phạm danh dự, nhân phẩm người khác bị phạt tiền (cá nhân 10-15 triệu đồng), buộc gỡ nội dung, và có thể phải xin lỗi, bồi thường dân sự.', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-mang-xa-hoi-xuc-pham-v1',
  'provision-sha256-v1', 'bccc9fb8ac735565a00f634b0630f1b7c5ccd4831d1e543b67133b6472e84da5', 'in_force',
  '2026-07-01'
FROM legal_sources s
WHERE s.document_number = '174/2026/NĐ-CP'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-mang-xa-hoi-xuc-pham-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Mạng xã hội', '✗', 'Xúc phạm danh dự người khác trên mạng',
  'Điểm a khoản 1 Điều 95 Nghị định 174/2026/NĐ-CP; Điều 34 Bộ luật Dân sự 2015', 'Phạt tiền từ 20.000.000 đến 30.000.000 đồng với hành vi lợi dụng mạng xã hội xúc phạm danh dự, nhân phẩm của cá nhân. Mức phạt nêu trên áp dụng với tổ chức; cá nhân vi phạm bị phạt bằng một nửa (Điều 4 Nghị định 174/2026/NĐ-CP). Người bị xúc phạm còn có quyền yêu cầu xin lỗi, cải chính công khai và bồi thường theo Bộ luật Dân sự.', 'Bất đồng thì góp ý riêng, văn minh; không đăng bài bêu xấu, chửi bới, chế ảnh hạ nhục người khác.',
  'Sau mâu thuẫn, một bạn lập bài ''bóc phốt'' kèm ảnh chế xúc phạm bạn cùng lớp. Ngoài nguy cơ bị phạt hành chính, bạn ấy còn có thể bị kiện đòi xin lỗi công khai và bồi thường.', '["mang-xa-hoi","xuc-pham","danh-du"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Mạng xã hội' AND title = 'Xúc phạm danh dự người khác trên mạng'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-mang-xa-hoi-xuc-pham-v1',
  'provision-sha256-v1', 'bccc9fb8ac735565a00f634b0630f1b7c5ccd4831d1e543b67133b6472e84da5'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Mạng xã hội' AND e.title = 'Xúc phạm danh dự người khác trên mạng'
  AND p.revision_id = 'seed-mang-xa-hoi-xuc-pham-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '32', '1',
  NULL, '1. Cá nhân có quyền đối với hình ảnh của mình. Việc sử dụng hình ảnh của cá nhân phải được người đó đồng ý. Việc sử dụng hình ảnh của người khác vì mục đích thương mại thì phải trả thù lao cho người có hình ảnh, trừ trường hợp các bên có thỏa thuận khác.',
  'Muốn dùng (đăng) ảnh của ai thì phải được người đó đồng ý; dùng vào mục đích kiếm tiền còn phải trả thù lao. Vi phạm thì người có ảnh có quyền yêu cầu gỡ, hủy ảnh và bồi thường.', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-mang-xa-hoi-dang-anh-v1',
  'provision-sha256-v1', 'abf6c05983acb60a794ed12c57751faba914fe69284da00c58bd486d4d81e27e', 'in_force',
  '2017-01-01'
FROM legal_sources s
WHERE s.document_number = '91/2015/QH13'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-mang-xa-hoi-dang-anh-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Mạng xã hội', '▣', 'Đăng ảnh người khác không xin phép',
  'Điều 32 Bộ luật Dân sự 2015', 'Việc sử dụng hình ảnh của cá nhân phải được người đó đồng ý. Người bị đăng ảnh trái phép có quyền yêu cầu Tòa án buộc thu hồi, tiêu hủy, chấm dứt việc sử dụng hình ảnh và bồi thường thiệt hại.', 'Hỏi ý kiến trước khi đăng ảnh có mặt người khác — kể cả ảnh nhóm bạn; người ta yêu cầu gỡ thì gỡ ngay.',
  'Một bạn đăng ảnh dìm của bạn thân lên nhóm lớp cho vui, bạn kia yêu cầu gỡ nhưng không gỡ. Theo Điều 32 BLDS, người có ảnh có quyền yêu cầu chấm dứt sử dụng và bồi thường nếu có thiệt hại.', '["mang-xa-hoi","hinh-anh","quyen-rieng-tu"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Mạng xã hội' AND title = 'Đăng ảnh người khác không xin phép'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-mang-xa-hoi-dang-anh-v1',
  'provision-sha256-v1', 'abf6c05983acb60a794ed12c57751faba914fe69284da00c58bd486d4d81e27e'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Mạng xã hội' AND e.title = 'Đăng ảnh người khác không xin phép'
  AND p.revision_id = 'seed-mang-xa-hoi-dang-anh-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '96', '3',
  'm', '3. Phạt tiền từ 10.000.000 đồng đến 20.000.000 đồng đối với một trong các hành vi sau: ... m) Tiết lộ thông tin thuộc danh mục bí mật nhà nước, đời sống riêng tư, bí mật cá nhân, bí mật gia đình mà chưa đến mức truy cứu trách nhiệm hình sự;',
  'Tiết lộ đời tư, bí mật cá nhân, bí mật gia đình của người khác lên mạng bị phạt tiền (cá nhân 5-10 triệu đồng), nếu nghiêm trọng có thể bị xử lý hình sự.', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-mang-xa-hoi-lo-thong-tin-v1',
  'provision-sha256-v1', 'fe16ea16d19200121c18f965fd4e13f62d5f282216395718ad03869f592efc31', 'in_force',
  '2026-07-01'
FROM legal_sources s
WHERE s.document_number = '174/2026/NĐ-CP'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-mang-xa-hoi-lo-thong-tin-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Mạng xã hội', '◫', 'Để lộ thông tin cá nhân, đời tư người khác',
  'Điểm m khoản 3 Điều 96 Nghị định 174/2026/NĐ-CP', 'Phạt tiền từ 10.000.000 đến 20.000.000 đồng với hành vi tiết lộ thông tin đời sống riêng tư, bí mật cá nhân, bí mật gia đình mà chưa đến mức truy cứu trách nhiệm hình sự. Mức phạt nêu trên áp dụng với tổ chức; cá nhân vi phạm bị phạt bằng một nửa (Điều 4 Nghị định 174/2026/NĐ-CP).', 'Không đăng địa chỉ nhà, số điện thoại, tin nhắn riêng, chuyện gia đình của người khác; thấy người khác bị lộ thông tin thì không chia sẻ tiếp.',
  'Giận bạn, một bạn chụp tin nhắn riêng tư và số điện thoại của bạn kia đăng lên nhóm chat trăm người. Đây là hành vi tiết lộ bí mật cá nhân và có thể bị phạt tiền.', '["mang-xa-hoi","thong-tin-ca-nhan","doi-tu"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Mạng xã hội' AND title = 'Để lộ thông tin cá nhân, đời tư người khác'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-mang-xa-hoi-lo-thong-tin-v1',
  'provision-sha256-v1', 'fe16ea16d19200121c18f965fd4e13f62d5f282216395718ad03869f592efc31'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Mạng xã hội' AND e.title = 'Để lộ thông tin cá nhân, đời tư người khác'
  AND p.revision_id = 'seed-mang-xa-hoi-lo-thong-tin-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '96', '3',
  'n', '3. Phạt tiền từ 10.000.000 đồng đến 20.000.000 đồng đối với một trong các hành vi sau: ... n) Giả mạo tổ chức, cá nhân và phát tán thông tin giả mạo, thông tin sai sự thật xâm hại đến quyền và lợi ích hợp pháp của tổ chức, cá nhân;',
  'Lập tài khoản, trang giả mạo người khác rồi phát tán thông tin giả bị phạt tiền (cá nhân 5-10 triệu đồng).', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-mang-xa-hoi-gia-mao-v1',
  'provision-sha256-v1', '765d3f873bc2d8dcd9478ef660cabaeece399975b0105b65eb0eb68df8e52bc3', 'in_force',
  '2026-07-01'
FROM legal_sources s
WHERE s.document_number = '174/2026/NĐ-CP'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-mang-xa-hoi-gia-mao-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Mạng xã hội', '⧉', 'Giả mạo tài khoản, trang của người khác',
  'Điểm n khoản 3 Điều 96 Nghị định 174/2026/NĐ-CP', 'Phạt tiền từ 10.000.000 đến 20.000.000 đồng với hành vi giả mạo tổ chức, cá nhân và phát tán thông tin giả mạo, sai sự thật xâm hại quyền, lợi ích hợp pháp của người khác. Mức phạt nêu trên áp dụng với tổ chức; cá nhân vi phạm bị phạt bằng một nửa (Điều 4 Nghị định 174/2026/NĐ-CP).', 'Không lập tài khoản mạo danh ai — kể cả ''cho vui''; phát hiện mình bị mạo danh thì báo cáo với nền tảng và lưu bằng chứng.',
  'Một nhóm bạn lập tài khoản giả tên và ảnh của thầy giáo để đăng bài đùa cợt. Hành vi giả mạo cá nhân này có thể bị phạt tiền, dù ''chỉ định trêu''.', '["mang-xa-hoi","gia-mao","tai-khoan"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Mạng xã hội' AND title = 'Giả mạo tài khoản, trang của người khác'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-mang-xa-hoi-gia-mao-v1',
  'provision-sha256-v1', '765d3f873bc2d8dcd9478ef660cabaeece399975b0105b65eb0eb68df8e52bc3'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Mạng xã hội' AND e.title = 'Giả mạo tài khoản, trang của người khác'
  AND p.revision_id = 'seed-mang-xa-hoi-gia-mao-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '18', '1',
  'b', '1. Hành vi sử dụng không gian mạng, công nghệ thông tin, phương tiện điện tử để vi phạm pháp luật về an ninh quốc gia, trật tự, an toàn xã hội bao gồm: ... b) Chiếm đoạt tài sản; tổ chức đánh bạc, đánh bạc qua mạng Internet; trộm cắp cước viễn thông quốc tế trên nền Internet; vi phạm bản quyền và sở hữu trí tuệ trên không gian mạng;',
  'Dùng mạng để chiếm đoạt tài sản (lừa đảo) là hành vi bị pháp luật nghiêm cấm; nghiêm trọng sẽ bị xử lý hình sự.', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-mang-xa-hoi-lua-dao-v1',
  'provision-sha256-v1', '128069ca143c08b06d8cf4150dd1f08508004ad72975709523189804302549c2', 'in_force',
  '2019-01-01'
FROM legal_sources s
WHERE s.document_number = '24/2018/QH14'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-mang-xa-hoi-lua-dao-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Mạng xã hội', '⚠', 'Lừa đảo qua mạng',
  'Điểm b khoản 1 Điều 18 Luật An ninh mạng 2018', 'Sử dụng không gian mạng để chiếm đoạt tài sản là hành vi vi phạm pháp luật về an ninh mạng; tùy tính chất, mức độ mà bị xử phạt hành chính hoặc truy cứu trách nhiệm hình sự về tội lừa đảo chiếm đoạt tài sản.', 'Không chuyển tiền cho người lạ trên mạng; cảnh giác ''việc nhẹ lương cao'', trúng thưởng, giả danh công an; bị lừa thì giữ bằng chứng và báo ngay cho phụ huynh, nhà trường hoặc công an.',
  'Một bạn được ''tuyển cộng tác viên chốt đơn'' yêu cầu nộp tiền cọc rồi mất liên lạc. Đây là thủ đoạn lừa đảo chiếm đoạt tài sản qua mạng rất phổ biến nhắm vào học sinh.', '["mang-xa-hoi","lua-dao","an-toan"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Mạng xã hội' AND title = 'Lừa đảo qua mạng'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-mang-xa-hoi-lua-dao-v1',
  'provision-sha256-v1', '128069ca143c08b06d8cf4150dd1f08508004ad72975709523189804302549c2'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Mạng xã hội' AND e.title = 'Lừa đảo qua mạng'
  AND p.revision_id = 'seed-mang-xa-hoi-lua-dao-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '96', '3',
  'g', '3. Phạt tiền từ 10.000.000 đồng đến 20.000.000 đồng đối với một trong các hành vi sau: ... g) Cung cấp, trao đổi, truyền đưa hoặc lưu trữ, sử dụng thông tin số nhằm đe dọa, quấy rối, xuyên tạc, vu khống, xúc phạm uy tín của tổ chức, danh dự, nhân phẩm, uy tín của người khác;',
  'Nhắn tin đe dọa, quấy rối, bôi nhọ người khác qua mạng bị phạt tiền (cá nhân 5-10 triệu đồng); nạn nhân nên lưu bằng chứng để báo cáo.', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-mang-xa-hoi-quay-roi-v1',
  'provision-sha256-v1', '7a890f39ff3a3b8fcddf00dcb5c4c3a67c1e0c757d5ab04ddb2dc0a306f696d0', 'in_force',
  '2026-07-01'
FROM legal_sources s
WHERE s.document_number = '174/2026/NĐ-CP'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-mang-xa-hoi-quay-roi-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Mạng xã hội', '☲', 'Quấy rối, bắt nạt qua mạng',
  'Điểm g khoản 3 Điều 96 Nghị định 174/2026/NĐ-CP', 'Phạt tiền từ 10.000.000 đến 20.000.000 đồng với hành vi sử dụng thông tin số nhằm đe dọa, quấy rối, xuyên tạc, vu khống, xúc phạm danh dự, nhân phẩm người khác. Mức phạt nêu trên áp dụng với tổ chức; cá nhân vi phạm bị phạt bằng một nửa (Điều 4 Nghị định 174/2026/NĐ-CP).', 'Là nạn nhân: chặn, lưu bằng chứng (ảnh chụp màn hình kèm thời gian), báo phụ huynh/giáo viên, báo cáo nền tảng. Là người chứng kiến: đừng hùa theo, đừng chia sẻ.',
  'Một nhóm lập group chat chỉ để chế ảnh, nhắn tin đe dọa một bạn trong lớp suốt nhiều tuần. Hành vi đe dọa, quấy rối qua mạng này có thể bị xử phạt và nhà trường xử lý kỷ luật.', '["mang-xa-hoi","quay-roi","bat-nat"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Mạng xã hội' AND title = 'Quấy rối, bắt nạt qua mạng'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-mang-xa-hoi-quay-roi-v1',
  'provision-sha256-v1', '7a890f39ff3a3b8fcddf00dcb5c4c3a67c1e0c757d5ab04ddb2dc0a306f696d0'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Mạng xã hội' AND e.title = 'Quấy rối, bắt nạt qua mạng'
  AND p.revision_id = 'seed-mang-xa-hoi-quay-roi-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '95', '1',
  'a', '1. Phạt tiền từ 20.000.000 đồng đến 30.000.000 đồng đối với hành vi lợi dụng mạng xã hội để thực hiện một trong các hành vi sau: a) Cung cấp, chia sẻ thông tin giả mạo, thông tin sai sự thật, xuyên tạc, vu khống, xúc phạm uy tín của cơ quan, tổ chức, danh dự, nhân phẩm của cá nhân;',
  'Quảng cáo bịa đặt, sai sự thật khi bán hàng trên mạng xã hội là cung cấp thông tin sai sự thật, bị phạt tiền (cá nhân 10-15 triệu đồng).', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-mang-xa-hoi-quang-cao-sai-v1',
  'provision-sha256-v1', 'fd93a42694b943037d7d54ebebb8ffab1c40cbba78f4c849543ec43eea12f1a2', 'in_force',
  '2026-07-01'
FROM legal_sources s
WHERE s.document_number = '174/2026/NĐ-CP'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-mang-xa-hoi-quang-cao-sai-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Mạng xã hội', '▤', 'Bán hàng online quảng cáo sai sự thật',
  'Điểm a khoản 1 Điều 95 Nghị định 174/2026/NĐ-CP', 'Thông tin quảng cáo bịa đặt, sai sự thật về hàng hóa đăng trên mạng xã hội thuộc nhóm hành vi cung cấp, chia sẻ thông tin sai sự thật: phạt tiền từ 20.000.000 đến 30.000.000 đồng. Mức phạt nêu trên áp dụng với tổ chức; cá nhân vi phạm bị phạt bằng một nửa (Điều 4 Nghị định 174/2026/NĐ-CP). Vi phạm về quảng cáo còn có thể bị xử lý theo pháp luật quảng cáo, bảo vệ người tiêu dùng.', 'Bán hàng online thì mô tả đúng sản phẩm, không dùng ảnh ''mượn'', không thổi phồng công dụng; người mua nên lưu tin nhắn, hóa đơn làm bằng chứng.',
  'Một bạn nhập mỹ phẩm trôi nổi về bán, quảng cáo là ''hàng chính hãng, trị mụn 100%''. Quảng cáo sai sự thật kiểu này có thể bị phạt tiền và phải bồi thường cho người mua.', '["mang-xa-hoi","ban-hang","quang-cao"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Mạng xã hội' AND title = 'Bán hàng online quảng cáo sai sự thật'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-mang-xa-hoi-quang-cao-sai-v1',
  'provision-sha256-v1', 'fd93a42694b943037d7d54ebebb8ffab1c40cbba78f4c849543ec43eea12f1a2'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Mạng xã hội' AND e.title = 'Bán hàng online quảng cáo sai sự thật'
  AND p.revision_id = 'seed-mang-xa-hoi-quang-cao-sai-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '95', '1',
  'c', '1. Phạt tiền từ 20.000.000 đồng đến 30.000.000 đồng đối với hành vi lợi dụng mạng xã hội để thực hiện một trong các hành vi sau: ... c) Cung cấp, chia sẻ thông tin miêu tả tỉ mỉ hành động chém, giết, tai nạn, kinh dị, rùng rợn;',
  'Đăng hoặc chia sẻ clip, hình ảnh miêu tả tỉ mỉ cảnh bạo lực, tai nạn, rùng rợn bị phạt tiền (cá nhân 10-15 triệu đồng).', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-mang-xa-hoi-noi-dung-bao-luc-v1',
  'provision-sha256-v1', '158f839c08dd41521ebfa49d4eed5fb7b85df3f04c4002c2609c392b132719f3', 'in_force',
  '2026-07-01'
FROM legal_sources s
WHERE s.document_number = '174/2026/NĐ-CP'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-mang-xa-hoi-noi-dung-bao-luc-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Mạng xã hội', '⊘', 'Chia sẻ nội dung bạo lực, rùng rợn',
  'Điểm c khoản 1 Điều 95 Nghị định 174/2026/NĐ-CP', 'Phạt tiền từ 20.000.000 đến 30.000.000 đồng với hành vi cung cấp, chia sẻ thông tin miêu tả tỉ mỉ hành động chém, giết, tai nạn, kinh dị, rùng rợn trên mạng xã hội. Mức phạt nêu trên áp dụng với tổ chức; cá nhân vi phạm bị phạt bằng một nửa (Điều 4 Nghị định 174/2026/NĐ-CP).', 'Thấy clip đánh nhau, tai nạn thì đừng chia sẻ lại — kể cả để ''cảnh báo''; hãy báo cáo nội dung cho nền tảng.',
  'Một bạn chia sẻ clip đánh nhau trước cổng trường kèm bình luận cợt nhả. Chia sẻ nội dung bạo lực cũng là hành vi vi phạm, đồng thời làm nạn nhân trong clip thêm tổn thương.', '["mang-xa-hoi","bao-luc","noi-dung-doc-hai"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Mạng xã hội' AND title = 'Chia sẻ nội dung bạo lực, rùng rợn'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-mang-xa-hoi-noi-dung-bao-luc-v1',
  'provision-sha256-v1', '158f839c08dd41521ebfa49d4eed5fb7b85df3f04c4002c2609c392b132719f3'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Mạng xã hội' AND e.title = 'Chia sẻ nội dung bạo lực, rùng rợn'
  AND p.revision_id = 'seed-mang-xa-hoi-noi-dung-bao-luc-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '28', '4',
  NULL, '4. Cố ý hủy bỏ hoặc làm vô hiệu biện pháp công nghệ hữu hiệu do tác giả, chủ sở hữu quyền tác giả thực hiện để bảo vệ quyền tác giả đối với tác phẩm của mình nhằm thực hiện hành vi quy định tại Điều này và Điều 35 của Luật này.',
  'Bẻ khóa (crack) phần mềm, phá các biện pháp bảo vệ bản quyền là hành vi xâm phạm quyền tác giả, có thể bị xử phạt và phải bồi thường.', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-shtt-phan-mem-crack-v1',
  'provision-sha256-v1', '5e96dbb2ecf23c57056cafc72dd437e48fc32e03bba543d5539aa66193e145ed', 'in_force',
  '2023-01-01'
FROM legal_sources s
WHERE s.document_number = '155/VBHN-VPQH'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-shtt-phan-mem-crack-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Sở hữu trí tuệ', '⌘', 'Dùng phần mềm crack, bẻ khóa',
  'Khoản 4 Điều 28 Luật Sở hữu trí tuệ (VBHN 155/VBHN-VPQH)', 'Cố ý hủy bỏ hoặc làm vô hiệu biện pháp công nghệ bảo vệ quyền tác giả (bẻ khóa, crack) là hành vi xâm phạm quyền tác giả; người vi phạm có thể bị xử phạt hành chính, buộc gỡ bỏ và bồi thường thiệt hại cho chủ sở hữu.', 'Dùng phần mềm miễn phí/mã nguồn mở hoặc bản quyền giáo dục (nhiều hãng giảm giá mạnh cho học sinh) thay vì tải bản crack — vừa vi phạm vừa dễ dính mã độc.',
  'Một bạn tải bản ''full crack'' của phần mềm đồ họa về làm bài tập. Ngoài việc xâm phạm quyền tác giả, máy của bạn ấy còn bị nhiễm mã độc đánh cắp tài khoản.', '["so-huu-tri-tue","phan-mem","ban-quyen"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Sở hữu trí tuệ' AND title = 'Dùng phần mềm crack, bẻ khóa'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-shtt-phan-mem-crack-v1',
  'provision-sha256-v1', '5e96dbb2ecf23c57056cafc72dd437e48fc32e03bba543d5539aa66193e145ed'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Sở hữu trí tuệ' AND e.title = 'Dùng phần mềm crack, bẻ khóa'
  AND p.revision_id = 'seed-shtt-phan-mem-crack-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '20', '1',
  'đ', 'đ) Phát sóng, truyền đạt đến công chúng tác phẩm bằng phương tiện hữu tuyến, vô tuyến, mạng thông tin điện tử hoặc bất kỳ phương tiện kỹ thuật nào khác, bao gồm cả việc cung cấp tác phẩm đến công chúng theo cách mà công chúng có thể tiếp cận được tại địa điểm và thời gian do họ lựa chọn;',
  'Đưa phim, nhạc của người khác lên mạng cho mọi người xem là quyền độc quyền của chủ sở hữu tác phẩm; tự ý đăng lại là xâm phạm bản quyền.', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-shtt-dang-lai-phim-v1',
  'provision-sha256-v1', 'fcfa46c529d932ec43cce7082ba2cf3d8368a70e6bdc4e26575e666588bf88b5', 'in_force',
  '2023-01-01'
FROM legal_sources s
WHERE s.document_number = '155/VBHN-VPQH'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-shtt-dang-lai-phim-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Sở hữu trí tuệ', '▶', 'Đăng lại phim, nhạc không xin phép',
  'Điểm đ khoản 1 Điều 20, khoản 2 Điều 28 Luật Sở hữu trí tuệ (VBHN 155/VBHN-VPQH)', 'Truyền đạt tác phẩm đến công chúng qua mạng là quyền tài sản độc quyền của chủ sở hữu; đăng lại phim, nhạc không phép là xâm phạm quyền tác giả — có thể bị gỡ nội dung, khóa kênh, xử phạt hành chính và bồi thường.', 'Xem phim, nghe nhạc trên nền tảng chính thức; muốn dùng lại một đoạn thì kiểm tra giấy phép hoặc xin phép chủ sở hữu.',
  'Một bạn cắt nguyên tập phim đang chiếu rạp đăng lên kênh cá nhân để ''review''. Kênh bị đánh bản quyền, video bị gỡ và có nguy cơ bị yêu cầu bồi thường.', '["so-huu-tri-tue","phim","nhac"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Sở hữu trí tuệ' AND title = 'Đăng lại phim, nhạc không xin phép'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-shtt-dang-lai-phim-v1',
  'provision-sha256-v1', 'fcfa46c529d932ec43cce7082ba2cf3d8368a70e6bdc4e26575e666588bf88b5'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Sở hữu trí tuệ' AND e.title = 'Đăng lại phim, nhạc không xin phép'
  AND p.revision_id = 'seed-shtt-dang-lai-phim-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '20', '1',
  'c', 'c) Sao chép trực tiếp hoặc gián tiếp toàn bộ hoặc một phần tác phẩm bằng bất kỳ phương tiện hay hình thức nào, trừ trường hợp quy định tại điểm a khoản 3 Điều này;',
  'Sao chép ảnh, tranh, tác phẩm của người khác (toàn bộ hay một phần) phải được phép của chủ sở hữu; tải về dùng lại tùy tiện là xâm phạm bản quyền.', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-shtt-dung-anh-v1',
  'provision-sha256-v1', '818637c00c3f3872eb28e5bd68e94a2fbb0d5720fae8c4dcc2797d202a72219e', 'in_force',
  '2023-01-01'
FROM legal_sources s
WHERE s.document_number = '155/VBHN-VPQH'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-shtt-dung-anh-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Sở hữu trí tuệ', '▣', 'Dùng ảnh trên mạng không xin phép',
  'Điểm c khoản 1 Điều 20, khoản 2 Điều 28 Luật Sở hữu trí tuệ (VBHN 155/VBHN-VPQH)', 'Sao chép tác phẩm (kể cả ảnh chụp, tranh vẽ tải trên mạng) mà không được phép là xâm phạm quyền tài sản của tác giả; có thể bị buộc gỡ bỏ, xử phạt hành chính và bồi thường.', 'Dùng kho ảnh miễn phí có giấy phép (ghi rõ điều kiện), hoặc xin phép và ghi nguồn tác giả; ''tải được trên Google'' không có nghĩa là được dùng tự do.',
  'Làm bài thuyết trình bán áo lớp, một bạn lấy bộ tranh của một họa sĩ trên mạng in lên áo. Họa sĩ phát hiện và yêu cầu dừng sử dụng, bồi thường — đây là quyền hợp pháp của tác giả.', '["so-huu-tri-tue","hinh-anh","tac-gia"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Sở hữu trí tuệ' AND title = 'Dùng ảnh trên mạng không xin phép'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-shtt-dung-anh-v1',
  'provision-sha256-v1', '818637c00c3f3872eb28e5bd68e94a2fbb0d5720fae8c4dcc2797d202a72219e'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Sở hữu trí tuệ' AND e.title = 'Dùng ảnh trên mạng không xin phép'
  AND p.revision_id = 'seed-shtt-dung-anh-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '19', '2',
  NULL, '2. Đứng tên thật hoặc bút danh trên tác phẩm; được nêu tên thật hoặc bút danh khi tác phẩm được công bố, sử dụng;',
  'Quyền đứng tên trên tác phẩm thuộc về tác giả thật. Chép bài người khác rồi ký tên mình là xâm phạm quyền tác giả và là đạo văn.', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-shtt-dao-van-v1',
  'provision-sha256-v1', 'be69871203b89f7099617a670b2c5d0755ecb40c446bc4afbacddc19b68ac178', 'in_force',
  '2023-01-01'
FROM legal_sources s
WHERE s.document_number = '155/VBHN-VPQH'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-shtt-dao-van-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Sở hữu trí tuệ', '✍', 'Đạo văn bài tập, đồ án',
  'Khoản 2 Điều 19, khoản 1 Điều 28 Luật Sở hữu trí tuệ (VBHN 155/VBHN-VPQH)', 'Chép bài của người khác rồi đứng tên mình xâm phạm quyền nhân thân của tác giả (quyền đứng tên trên tác phẩm); ngoài hệ quả pháp lý, nhà trường còn xử lý kỷ luật theo quy chế riêng.', 'Được tham khảo nhưng phải tự viết và ghi rõ nguồn trích dẫn; chép nguyên đoạn phải để trong ngoặc kép kèm tên tác giả.',
  'Một bạn nộp bài văn chép gần nguyên từ blog của người khác và đạt giải. Khi bị phát hiện, giải bị thu hồi — quyền đứng tên tác phẩm thuộc về người viết thật.', '["so-huu-tri-tue","dao-van","hoc-tap"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Sở hữu trí tuệ' AND title = 'Đạo văn bài tập, đồ án'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-shtt-dao-van-v1',
  'provision-sha256-v1', 'be69871203b89f7099617a670b2c5d0755ecb40c446bc4afbacddc19b68ac178'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Sở hữu trí tuệ' AND e.title = 'Đạo văn bài tập, đồ án'
  AND p.revision_id = 'seed-shtt-dao-van-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '20', '1',
  'a', 'a) Làm tác phẩm phái sinh;',
  'Lấy nhân vật, hình vẽ có bản quyền chế thành sản phẩm khác (áo, sticker...) là ''làm tác phẩm phái sinh'' — quyền độc quyền của chủ sở hữu; muốn kinh doanh phải xin phép.', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-shtt-in-ao-nhan-vat-v1',
  'provision-sha256-v1', '22b0085d58b0f8cdfdf10df6f60e7a6299913e38e80b406a5f2e719f7b076860', 'in_force',
  '2023-01-01'
FROM legal_sources s
WHERE s.document_number = '155/VBHN-VPQH'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-shtt-in-ao-nhan-vat-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Sở hữu trí tuệ', '◈', 'In áo, đồ dùng hình nhân vật bản quyền để bán',
  'Điểm a khoản 1 Điều 20, khoản 2 Điều 28 Luật Sở hữu trí tuệ (VBHN 155/VBHN-VPQH)', 'Làm tác phẩm phái sinh (in hình nhân vật lên áo, ốp lưng, sticker...) để kinh doanh mà không được phép là xâm phạm quyền tài sản của chủ sở hữu; có thể bị buộc dừng bán, tiêu hủy hàng và bồi thường.', 'Kinh doanh đồ in hình thì dùng thiết kế tự vẽ, thiết kế đã mua bản quyền, hoặc xin giấy phép chính thức từ chủ sở hữu nhân vật.',
  'Một nhóm bạn in áo hình nhân vật hoạt hình nổi tiếng bán gây quỹ lớp. Dù mục đích tốt, việc thương mại hóa hình ảnh nhân vật có bản quyền vẫn cần được phép của chủ sở hữu.', '["so-huu-tri-tue","nhan-vat","kinh-doanh"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Sở hữu trí tuệ' AND title = 'In áo, đồ dùng hình nhân vật bản quyền để bán'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-shtt-in-ao-nhan-vat-v1',
  'provision-sha256-v1', '22b0085d58b0f8cdfdf10df6f60e7a6299913e38e80b406a5f2e719f7b076860'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Sở hữu trí tuệ' AND e.title = 'In áo, đồ dùng hình nhân vật bản quyền để bán'
  AND p.revision_id = 'seed-shtt-in-ao-nhan-vat-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '129', '1',
  'a', 'a) Sử dụng dấu hiệu trùng với nhãn hiệu được bảo hộ cho hàng hóa, dịch vụ trùng với hàng hóa, dịch vụ thuộc danh mục đăng ký kèm theo nhãn hiệu đó;',
  'Gắn logo, nhãn hiệu của hãng lên hàng không phải do hãng sản xuất (hàng nhái) là xâm phạm nhãn hiệu; mua bán loại hàng này đều rủi ro pháp lý.', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-shtt-hang-nhai-v1',
  'provision-sha256-v1', '2e99ce25082fb788c9237b8673362c3652f5e34e50c64e97ef53ae572ca27f69', 'in_force',
  '2006-07-01'
FROM legal_sources s
WHERE s.document_number = '155/VBHN-VPQH'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-shtt-hang-nhai-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Sở hữu trí tuệ', '⊗', 'Mua bán hàng nhái nhãn hiệu',
  'Điểm a khoản 1 Điều 129 Luật Sở hữu trí tuệ (VBHN 155/VBHN-VPQH)', 'Sử dụng dấu hiệu trùng với nhãn hiệu được bảo hộ cho hàng hóa cùng loại là xâm phạm quyền đối với nhãn hiệu; người kinh doanh hàng nhái có thể bị xử phạt hành chính, tịch thu hàng hóa, và bồi thường cho chủ nhãn hiệu.', 'Không nhập, không rao bán ''hàng super fake''; người mua nên chọn kênh phân phối chính hãng — bán hàng nhái là vi phạm kể cả khi nói rõ đó là hàng nhái.',
  'Một bạn nhập giày gắn logo hãng nổi tiếng giá rẻ về bán online, quảng cáo là ''rep 1:1''. Việc gắn nhãn hiệu được bảo hộ lên hàng không phải chính hãng là xâm phạm nhãn hiệu.', '["so-huu-tri-tue","nhan-hieu","hang-gia"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Sở hữu trí tuệ' AND title = 'Mua bán hàng nhái nhãn hiệu'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-shtt-hang-nhai-v1',
  'provision-sha256-v1', '2e99ce25082fb788c9237b8673362c3652f5e34e50c64e97ef53ae572ca27f69'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Sở hữu trí tuệ' AND e.title = 'Mua bán hàng nhái nhãn hiệu'
  AND p.revision_id = 'seed-shtt-hang-nhai-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '20', '1',
  'c', 'c) Sao chép trực tiếp hoặc gián tiếp toàn bộ hoặc một phần tác phẩm bằng bất kỳ phương tiện hay hình thức nào, trừ trường hợp quy định tại điểm a khoản 3 Điều này;',
  'Scan/chụp truyện, sách rồi đăng lên mạng là sao chép tác phẩm không phép — xâm phạm bản quyền của tác giả và nhà xuất bản.', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-shtt-truyen-scan-v1',
  'provision-sha256-v1', '8982658e19512c19f23e9d38187a12a372c7dbd6498d40b5c4214906bce01f07', 'in_force',
  '2023-01-01'
FROM legal_sources s
WHERE s.document_number = '155/VBHN-VPQH'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-shtt-truyen-scan-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Sở hữu trí tuệ', '▤', 'Đăng lại truyện scan, sách lậu',
  'Điểm c khoản 1 Điều 20, khoản 2 Điều 28 Luật Sở hữu trí tuệ (VBHN 155/VBHN-VPQH)', 'Scan, chụp lại truyện, sách rồi đăng lên mạng là sao chép và truyền đạt tác phẩm không phép — xâm phạm quyền tài sản của tác giả, nhà xuất bản; trang đăng có thể bị yêu cầu gỡ và bồi thường.', 'Đọc truyện trên nền tảng có bản quyền; ủng hộ bản in hoặc bản điện tử chính thức để tác giả còn tiếp tục sáng tác.',
  'Một bạn chụp trọn bộ truyện tranh mới phát hành đăng lên nhóm ''đọc chùa''. Nhà phát hành báo cáo, nhóm bị đóng — và doanh thu nuôi tác giả cũng biến mất theo.', '["so-huu-tri-tue","truyen","scan"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Sở hữu trí tuệ' AND title = 'Đăng lại truyện scan, sách lậu'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-shtt-truyen-scan-v1',
  'provision-sha256-v1', '8982658e19512c19f23e9d38187a12a372c7dbd6498d40b5c4214906bce01f07'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Sở hữu trí tuệ' AND e.title = 'Đăng lại truyện scan, sách lậu'
  AND p.revision_id = 'seed-shtt-truyen-scan-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '20', '2',
  NULL, 'Tổ chức, cá nhân khi khai thác, sử dụng một, một số hoặc toàn bộ các quyền quy định tại khoản 1 Điều này và khoản 3 Điều 19 của Luật này phải được sự cho phép của chủ sở hữu quyền tác giả và trả tiền bản quyền, các quyền lợi vật chất khác (nếu có) cho chủ sở hữu quyền tác giả, trừ trường hợp quy định tại khoản 3 Điều này, các điều 25, 25a, 26, 32 và 33 của Luật này.',
  'Muốn dùng nhạc của người khác trong video phải được chủ sở hữu cho phép và trả tiền bản quyền, trừ một số ngoại lệ luật cho phép.', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-shtt-nhac-nen-v1',
  'provision-sha256-v1', 'f2c9da21b1405da5e691335bb1cee404a9829c1bdbaa788d6584a17c1b948da6', 'in_force',
  '2023-01-01'
FROM legal_sources s
WHERE s.document_number = '155/VBHN-VPQH'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-shtt-nhac-nen-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Sở hữu trí tuệ', '♪', 'Dùng nhạc bản quyền làm nhạc nền video',
  'Điểm đ khoản 1, khoản 2 Điều 20 Luật Sở hữu trí tuệ (VBHN 155/VBHN-VPQH)', 'Dùng bản nhạc có bản quyền trong video đăng mạng là khai thác quyền truyền đạt tác phẩm — phải được phép và trả tiền bản quyền cho chủ sở hữu, trừ các ngoại lệ luật định; video vi phạm có thể bị tắt tiếng, gỡ bỏ hoặc bị khiếu nại bản quyền.', 'Dùng nhạc trong thư viện miễn phí bản quyền của nền tảng, nhạc đã mua giấy phép, hoặc nhạc tự sáng tác.',
  'Video kỷ yếu của lớp dùng một bản hit làm nhạc nền bị nền tảng tắt tiếng vì khiếu nại bản quyền. Chọn nhạc từ thư viện miễn phí ngay từ đầu thì video đã không bị ảnh hưởng.', '["so-huu-tri-tue","nhac","video"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Sở hữu trí tuệ' AND title = 'Dùng nhạc bản quyền làm nhạc nền video'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-shtt-nhac-nen-v1',
  'provision-sha256-v1', 'f2c9da21b1405da5e691335bb1cee404a9829c1bdbaa788d6584a17c1b948da6'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Sở hữu trí tuệ' AND e.title = 'Dùng nhạc bản quyền làm nhạc nền video'
  AND p.revision_id = 'seed-shtt-nhac-nen-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );

INSERT INTO legal_provisions (
  source_id, article, clause, point, original_text, simplified_text,
  status, created_by, reviewed_by, reviewed_at, revision_id,
  checksum_version, checksum_sha256, effectivity_status, effective_from
)
SELECT s.id, '129', '1',
  'c', 'c) Sử dụng dấu hiệu tương tự với nhãn hiệu được bảo hộ cho hàng hóa, dịch vụ trùng, tương tự hoặc liên quan tới hàng hóa, dịch vụ thuộc danh mục đăng ký kèm theo nhãn hiệu đó, nếu việc sử dụng có khả năng gây nhầm lẫn về nguồn gốc hàng hóa, dịch vụ;',
  'Nhái logo/nhãn hiệu của người khác đến mức dễ gây nhầm lẫn là xâm phạm quyền nhãn hiệu, dù có chỉnh sửa đôi chút.', 'published', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-shtt-chep-logo-v1',
  'provision-sha256-v1', '43caf3d824ac0808110ae72cbeb6dbe4b3572b8aa22c82ed50b9fcdc70294fe6', 'in_force',
  '2006-07-01'
FROM legal_sources s
WHERE s.document_number = '155/VBHN-VPQH'
  AND NOT EXISTS (
    SELECT 1 FROM legal_provisions WHERE revision_id = 'seed-shtt-chep-logo-v1'
  );

INSERT INTO legal_entries (
  topic, icon, title, legal_basis, penalty, remedy, case_study, tags,
  status, review_status, created_by, reviewed_by, reviewed_at
)
SELECT 'Sở hữu trí tuệ', '◎', 'Chép, nhái thiết kế logo',
  'Điểm c khoản 1 Điều 129 Luật Sở hữu trí tuệ (VBHN 155/VBHN-VPQH)', 'Sử dụng dấu hiệu tương tự với nhãn hiệu được bảo hộ đến mức gây nhầm lẫn về nguồn gốc hàng hóa, dịch vụ là xâm phạm quyền nhãn hiệu; có thể bị buộc chấm dứt sử dụng, đổi nhận diện và bồi thường.', 'Thiết kế logo cho câu lạc bộ, dự án thì làm mới hoàn toàn; trước khi dùng nên tra cứu nhãn hiệu đã đăng ký để tránh ''giống vô tình''.',
  'Câu lạc bộ của trường ''chế'' logo một thương hiệu đồ uống nổi tiếng thành logo nhóm và in lên đồng phục bán ra ngoài. Dùng dấu hiệu tương tự gây nhầm lẫn như vậy là xâm phạm nhãn hiệu.', '["so-huu-tri-tue","logo","thiet-ke"]',
  'published', 'four_eyes_verified', 'seed-editor', 'seed-reviewer',
  '2026-07-31T16:15:09.126Z'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entries
  WHERE topic = 'Sở hữu trí tuệ' AND title = 'Chép, nhái thiết kế logo'
);

INSERT INTO legal_entry_citations (
  legal_entry_id, provision_id, display_order, review_status,
  created_by, reviewed_by, reviewed_at, cited_revision_id,
  cited_checksum_version, cited_checksum_sha256
)
SELECT e.id, p.id, 0, 'four_eyes_verified', 'seed-editor',
  'seed-reviewer', '2026-07-31T16:15:09.126Z', 'seed-shtt-chep-logo-v1',
  'provision-sha256-v1', '43caf3d824ac0808110ae72cbeb6dbe4b3572b8aa22c82ed50b9fcdc70294fe6'
FROM legal_entries e, legal_provisions p
WHERE e.topic = 'Sở hữu trí tuệ' AND e.title = 'Chép, nhái thiết kế logo'
  AND p.revision_id = 'seed-shtt-chep-logo-v1'
  AND NOT EXISTS (
    SELECT 1 FROM legal_entry_citations c
    WHERE c.legal_entry_id = e.id AND c.provision_id = p.id
  );
COMMIT;