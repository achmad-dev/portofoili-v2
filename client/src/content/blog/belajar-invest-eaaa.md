# Belajar invest eaaa

![Image](https://cdn-images-1.medium.com/max/789/1*iDV-tCv3FSGIBQceva3TFA.png)

Bayangkan, di Bursa Efek Indonesia (BEI) saat ini ada lebih dari **900 saham**. Kalau kita harus cek laporan keuangannya satu per satu secara manual, bisa keriting jari kita. Mustahil, kan?

Nah, karena itu kita butuh teknik yang namanya **Screening Saham**. Tujuannya simpel: menyaring tumpukan jerami (900 saham) untuk menemukan 10–20 jarum emas (kandidat terbaik) yang layak kita analisa lebih dalam.

Tapi sebelum kita masuk ke kodingan Python, kita harus paham dulu logikanya. Apa sih yang mau kita cari? Gampangnya, kita bisa pakai 3 filter utama ini:

### 1. Filter Kualitas (Profitability & Health)

Di sini kita memastikan perusahaannya bagus, jago cari untung, dan nggak mau bangkrut.

**a. ROE (Return on Equity)**

- **Target:** > 10% — 15%

- **Analogi:** Bayangkan ROE itu seperti “skor kecerdasan” manajemen. Semakin tinggi, semakin jago mereka memutar modal kita. Angka 15% berarti setiap Rp100 modal yang kita setor, manajemen bisa mengubahnya jadi laba Rp15.

- **Rumus:**

![Image](https://cdn-images-1.medium.com/max/466/1*1waV5KmtEnez3nuqHdxnPA.png)

**b. DER (Debt to Equity Ratio)**

- **Target:** < 1 (atau < 100%)

- **Analogi:** Ini indikator keamanan. Kita nggak mau investasi di perusahaan yang “lebih besar pasak daripada tiang” (utang lebih gede dari modal). DER di bawah 1 menjaga perusahaan aman dari risiko kebangkrutan saat ekonomi sulit.

- **Rumus:**

![Image](https://cdn-images-1.medium.com/max/400/1*zNSGC6qFwc-1-LXsgIuw-g.png)

**c. NPM (Net Profit Margin)**

- **Target:** > 5% — 10%

- **Analogi:** Ini untuk memastikan bisnisnya sehat, bukan tipe bisnis yang cuma “bakar duit” demi omset tapi ujungnya boncos.

- **Rumus:**

![Image](https://cdn-images-1.medium.com/max/459/1*zPXO2o550huE8fNjoYa16g.png)

### 2. Filter Murah/Mahal (Valuation)

Perusahaan bagus kalau harganya kemahalan (salah harga) juga percuma. Kita cari yang *undervalued*.

**a. PER (Price to Earnings Ratio)**

- **Target:** < 10x — 15x

- **Analogi:** Berapa tahun kamu balik modal? PER 5x artinya secara teori (jika laba konstan), kamu akan balik modal dalam 5 tahun. Semakin kecil PER, semakin murah (dan makin cepat balik modal).

- **Rumus:**

![Image](https://cdn-images-1.medium.com/max/405/1*R-4CVSBzoe9aE2p2_8UeKQ.png)

**b. PBV (Price to Book Value)**

- **Target:** < 1x — 1.5x

- **Analogi:** Bayangkan kamu beli rumah seharga Rp800 juta, padahal harga tanah dan bangunannya kalau dijual eceran Rp1 Miliar. Itu namanya PBV < 1 (diskon). Ini sangat relevan buat saham bank atau properti.

- **Rumus:**

![Image](https://cdn-images-1.medium.com/max/576/1*x9fiMaKTyHym6D2lqT5wpw.png)

### 3. Filter Pertumbuhan (Growth)

Kita nggak mau beli perusahaan yang jalan di tempat, kan?

**a. EPS Growth**

- **Target:** Positif (bertumbuh dalam 3–5 tahun terakhir)

- **Artinya:** Laba per lembar sahamnya terus naik dari tahun ke tahun. Ini tanda bisnisnya sedang ekspansi, bukan <i>sunset industry</i>.

- **Rumus:**

![Image](https://cdn-images-1.medium.com/max/550/1*SZGBowjCulGYu8coKJI42Q.png)

Nah, sekarang bagian serunya. Daripada capek screening manual, kita bisa automasi proses di atas menggunakan Python.

Kita akan menggunakan library **yfinance** untuk menarik data fundamental saham-saham di Indonesia secara gratis (cukup tambahkan kode .JK di belakang ticker saham).

Pertama kita perlu install library **yfinance dan pandas**

```text
pip install yfinance pandas

```

nah terus ini contoh kode untuk automasi screening saham dengan python

```text
import yfinance as yf
import pandas as pd
import time

stock_list = [
    # --- PERBANKAN (The Big 4 + Syariah) ---
    'BBCA', 'BBRI', 'BMRI', 'BBNI', 'BRIS', 'BBTN',

    # --- CONSUMER GOODS (Defensive & Retail) ---
    'ICBP', 'INDF', 'UNVR', 'MYOR', 'KLBF',     # Makanan/Obat
    'HMSP', 'GGRM',                             # Rokok (High Dividend yield case)
    'AMRT', 'MAPI', 'ACES',                     # Retail

    # --- KOMODITAS & ENERGI (Cyclical) ---
    'ADRO', 'ITMG', 'PTBA', 'HRUM',             # Batubara
    'PGAS', 'AKRA', 'MEDC',                     # Minyak & Gas
    'ANTM', 'INCO', 'MDKA', 'ARCI',             # Logam (Emas/Nikel)

    # --- INFRASTRUKTUR & TELEKOMUNIKASI ---
    'TLKM', 'ISAT', 'EXCL',                     # Telco
    'JSMR',                                     # Jalan Tol
    'ASII', 'UNTR',                             # Konglomerasi & Alat Berat

    # --- TEKNOLOGI & BANK DIGITAL ---
    'GOTO', 'ARTO', 'BUKA', 'EMTK',

    # --- PROPERTI & KONSTRUKSI ---
    'CTRA', 'PWON', 'BSDE', 'SMRA',

    # --- POULTRY (Ayam-ayaman) ---
    'CPIN', 'JPFA'
]

# Tambahkan suffix .JK karena Yahoo Finance menggunakan format ini untuk IDX
tickers = [f"{code}.JK" for code in stock_list]

def get_stock_fundamentals(ticker_list):
    data = []
    
    print(f"Memulai scanning {len(ticker_list)} saham...\n")
    
    for ticker in ticker_list:
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            
           
            name = info.get('longName', ticker)
            price = info.get('currentPrice', 0)
            
            # Valuation Metrics
            per = info.get('trailingPE', None) 
            pbv = info.get('priceToBook', None)
            
            # Profitability & Health Metrics
            roe = info.get('returnOnEquity', 0) 
            npm = info.get('profitMargins', 0)
            der = info.get('debtToEquity', 0) 
            
            
            roe_pct = roe * 100 if roe else 0
            npm_pct = npm * 100 if npm else 0
            der_ratio = der / 100 if der else 0

            data.append({
                'Ticker': ticker.replace('.JK', ''),
                'Name': name,
                'Price': price,
                'PER': per,
                'PBV': pbv,
                'ROE (%)': roe_pct,
                'NPM (%)': npm_pct,
                'DER (x)': der_ratio
            })
            
            print(f"Fetched: {ticker}")
            
        except Exception as e:
            print(f"Error fetching {ticker}: {e}")
    
    return pd.DataFrame(data)

df = get_stock_fundamentals(tickers)

print("\n--- MENERAPKAN FILTER ---")

potential_stocks = df[
    (df['ROE (%)'] > 10) &
    (df['PER'] < 15) & 
    (df['PER'] > 0) &
    (df['PBV'] < 2) &
    (df['DER (x)'] < 1)
].sort_values(by='ROE (%)', ascending=False) 

pd.set_option('display.max_columns', None)
pd.set_option('display.width', 1000)

if not potential_stocks.empty:
    print("\n[HASIL SCREENING: POTENTIAL STOCKS]")
    print(potential_stocks[['Ticker', 'Price', 'PER', 'PBV', 'ROE (%)', 'DER (x)']])
else:
    print("Tidak ada saham yang lolos kriteria ketat ini.")

```

nah contoh hasil screening dengan kode diatas

![Image](https://cdn-images-1.medium.com/max/483/1*5pam6W_lyDIrLQ8p36I1PA.png)

---

Published 2025-12-27 · [Read on medium](https://medium.com/@moonNight1/belajar-invest-eaaa-46ea9ef371eb?source=rss-86218010e568------2)
