import io
import sys
import tempfile
import unittest
from pathlib import Path

import fitz
from reportlab.pdfgen.canvas import Canvas

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from private_pdf_probe import probe


class PrivatePdfProbeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.plain = self.root / 'test.pdf'
        c = Canvas(str(self.plain))
        c.drawString(72, 720, 'SYNTHETIC-ONLY - test money 30.00')
        c.save()
        self.encrypted = self.root / 'protected.pdf'
        with fitz.open(str(self.plain)) as pdf:
            pdf.save(str(self.encrypted), encryption=fitz.PDF_ENCRYPT_AES_256,
                     user_pw='SYNTHETIC-PASSWORD',owner_pw='SYNTHETIC-OWNER')

    def test_plaintext_probe_never_returns_contents(self):
        r = probe(self.plain, 'BCP_SAVINGS')
        self.assertEqual(r['status'], 'STRUCTURALLY_OPENABLE')
        self.assertEqual(r['pageCount'], 1)
        self.assertEqual(r['pagesWithTextLayer'], 1)
        self.assertEqual(r['gates']['G0'], 'NOT_RUN')
        self.assertNotIn('SYNTHETIC-ONLY',repr(r))
        self.assertNotIn('30.00',repr(r))

    def test_encrypted_without_password_fails_closed(self):
        r = probe(self.encrypted,'RIPLEY_CREDIT')
        self.assertEqual(r['status'], 'PASSWORD_REQUIRED')
        self.assertIsNone(r['pageCount'])

    def test_wrong_password_never_returns_contents(self):
        r = probe(self.encrypted,'RIPLEY_CREDIT','bad-password')
        self.assertEqual(r['status'], 'INVALID_PASSWORD')
        self.assertNotIn('bad-password',repr(r))

    def test_correct_password_opens_without_publishing(self):
        r = probe(self.encrypted,'RIPLEY_CREDIT','SYNTHETIC-PASSWORD')
        self.assertEqual(r['status'], 'STRUCTURALLY_OPENABLE')
        self.assertEqual(r['pageCount'], 1)
        self.assertNotIn('SYNTHETIC-PASSWORD',repr(r))
        self.assertNotIn('SYNTHETIC-ONLY',repr(r))

    def test_invalid_document_fails_closed(self):
        f = self.root / 'bad.pdf'
        f.write_bytes(b'not a PDF')
        r = probe(f,'BCP_SAVINGS')
        self.assertEqual(r['status'], 'INVALID_PDF')
        self.assertEqual(r['gates']['G0'],'NOT_RUN')


if __name__=='__main__':
    unittest.main()
