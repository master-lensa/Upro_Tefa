import React, { useState, useEffect } from 'react';

// URL API Backend Google Apps Script Anda
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbyKINi7NYQ4xiafEyPpvmRPehaXKn-ox9ZRcNu9WVEF8fsi7579wuI1odXqtawZZNK3kg/exec";

// Saldo Awal Masing-Masing File Buku Kas
const INITIAL_SALDO = {
  tefa: 959906,       // Buku Kas Umum Tefa-DKV-2026
  upro: 2038831.6     // Buku Kas Umum Upro-DKV-2026
};

const MONTHS_LIST = [
  'JAN', 'FEB', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 
  'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
];

export default function App() {
  const [activeKind, setActiveKind] = useState('tefa'); // 'tefa' | 'upro'
  const [activeMonth, setActiveMonth] = useState('JAN');
  const [booksData, setBooksData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State Transaksi
  const [form, setForm] = useState({
    tanggal: '',
    noBukti: '',
    uraian: '',
    unit: '',
    hargaUnit: '',
    jenis: 'pemasukan'
  });

  // Fetch Data dari API
  const loadBackendData = async (kind) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${GAS_API_URL}?kind=${kind}`);
      const data = await res.json();
      if (data && typeof data === 'object') {
        setBooksData(data);
      } else {
        setBooksData({});
      }
    } catch (err) {
      console.error("Gagal memuat data dari server:", err);
      setBooksData({});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBackendData(activeKind);
  }, [activeKind]);

  // Simpan Data ke API
  const saveBackendData = async (updatedBooksData) => {
    setIsSaving(true);
    try {
      await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          kind: activeKind,
          data: updatedBooksData
        })
      });
    } catch (err) {
      console.error("Gagal menyimpan ke server:", err);
      alert("Terjadi kesalahan koneksi saat menyimpan data.");
    } finally {
      setIsSaving(false);
    }
  };

  // Kalkulasi Saldo Kumulatif Berantai per Bulan
  const calculateMonthTransactions = () => {
    let currentBalance = INITIAL_SALDO[activeKind] || 0;
    const monthDataObj = {};

    MONTHS_LIST.forEach((m) => {
      const rawTxList = booksData[m] || [];
      const openingBalance = currentBalance;
      
      const processedTx = rawTxList.map((tx) => {
        const amount = Number(tx.jumlah) || 0;
        if (tx.jenis === 'pemasukan') {
          currentBalance += amount;
        } else {
          currentBalance -= amount;
        }
        return {
          ...tx,
          saldoRunning: currentBalance
        };
      });

      monthDataObj[m] = {
        openingBalance: openingBalance,
        transactions: processedTx,
        closingBalance: currentBalance
      };
    });

    return monthDataObj;
  };

  const calculatedData = calculateMonthTransactions();
  const currentMonthData = calculatedData[activeMonth] || { openingBalance: 0, transactions: [], closingBalance: 0 };

  // Handler Tambah Transaksi
  const handleAddTransaction = (e) => {
    e.preventDefault();
    if (!form.uraian) {
      alert("Uraian item wajib diisi!");
      return;
    }

    const qty = Number(form.unit) || 1;
    const price = Number(form.hargaUnit) || 0;
    const totalAmount = qty * price;

    const newTx = {
      id: Date.now().toString(),
      tanggal: form.tanggal || new Date().toISOString().split('T')[0],
      noBukti: form.noBukti,
      uraian: form.uraian,
      unit: qty,
      hargaUnit: price,
      jumlah: totalAmount,
      jenis: form.jenis
    };

    const currentList = booksData[activeMonth] || [];
    const updatedList = [...currentList, newTx];
    const newBooksData = { ...booksData, [activeMonth]: updatedList };

    setBooksData(newBooksData);
    saveBackendData(newBooksData);

    setForm({
      tanggal: '',
      noBukti: '',
      uraian: '',
      unit: '',
      hargaUnit: '',
      jenis: 'pemasukan'
    });
  };

  // Handler Hapus Transaksi
  const handleDeleteTransaction = (txId) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) return;

    const currentList = booksData[activeMonth] || [];
    const updatedList = currentList.filter(item => item.id !== txId);
    const newBooksData = { ...booksData, [activeMonth]: updatedList };

    setBooksData(newBooksData);
    saveBackendData(newBooksData);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER & SWITCHER FILE KAS */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Buku Kas Umum DKV 2026</h1>
            <p className="text-sm text-slate-500">
              Aktif: <span className="font-semibold text-slate-800">
                {activeKind === 'tefa' ? 'Buku Kas Umum Tefa-DKV-2026' : 'Buku Kas Umum Upro-DKV-2026'}
              </span>
            </p>
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-lg border border-slate-200 self-start md:self-auto">
            <button
              onClick={() => setActiveKind('tefa')}
              className={`px-5 py-2.5 rounded-md text-sm font-semibold transition ${
                activeKind === 'tefa'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kas TEFA
            </button>
            <button
              onClick={() => setActiveKind('upro')}
              className={`px-5 py-2.5 rounded-md text-sm font-semibold transition ${
                activeKind === 'upro'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kas UPRO
            </button>
          </div>
        </div>

        {/* TAB PILIHAN BULAN */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {MONTHS_LIST.map((m) => (
            <button
              key={m}
              onClick={() => setActiveMonth(m)}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap border transition ${
                activeMonth === m
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* FORM INPUT TRANSAKSI */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-lg font-bold text-slate-800">
            Tambah Transaksi ({activeKind.toUpperCase()} - Bulan {activeMonth})
          </h2>
          <form onSubmit={handleAddTransaction} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <input
              type="date"
              className="p-2 border border-slate-300 rounded-md text-sm"
              value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
            />
            <input
              type="text"
              placeholder="No. Bukti"
              className="p-2 border border-slate-300 rounded-md text-sm"
              value={form.noBukti}
              onChange={(e) => setForm({ ...form, noBukti: e.target.value })}
            />
            <input
              type="text"
              placeholder="Uraian / Item *"
              className="p-2 border border-slate-300 rounded-md text-sm md:col-span-2"
              value={form.uraian}
              onChange={(e) => setForm({ ...form, uraian: e.target.value })}
            />
            <input
              type="number"
              placeholder="Unit/Qty"
              className="p-2 border border-slate-300 rounded-md text-sm"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
            <input
              type="number"
              placeholder="Harga/Unit (Rp)"
              className="p-2 border border-slate-300 rounded-md text-sm"
              value={form.hargaUnit}
              onChange={(e) => setForm({ ...form, hargaUnit: e.target.value })}
            />
            <select
              className="p-2 border border-slate-300 rounded-md text-sm bg-white"
              value={form.jenis}
              onChange={(e) => setForm({ ...form, jenis: e.target.value })}
            >
              <option value="pemasukan">Pemasukan (+)</option>
              <option value="pengeluaran">Pengeluaran (-)</option>
            </select>
            <button
              type="submit"
              disabled={isSaving}
              className="md:col-span-2 lg:col-span-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded-md text-sm transition"
            >
              {isSaving ? 'Menyimpan...' : 'Tambah Data'}
            </button>
          </form>
        </div>

        {/* TABEL HASIL & SALDO */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 font-medium">Memuat data dari API...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-xs">
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">No. Bukti</th>
                    <th className="p-3">Uraian / Item</th>
                    <th className="p-3 text-center">Unit</th>
                    <th className="p-3 text-right">Harga / Unit</th>
                    <th className="p-3 text-right">Pemasukan</th>
                    <th className="p-3 text-right">Pengeluaran</th>
                    <th className="p-3 text-right">Saldo</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {/* BARIS SALDO SEBELUMNYA */}
                  <tr className="bg-amber-50 font-semibold text-slate-700">
                    <td className="p-3" colSpan={3}>
                      SALDO SEBELUMNYA ({activeMonth})
                    </td>
                    <td className="p-3 text-center">-</td>
                    <td className="p-3 text-right">-</td>
                    <td className="p-3 text-right">-</td>
                    <td className="p-3 text-right">-</td>
                    <td className="p-3 text-right text-emerald-700 font-bold">
                      Rp{currentMonthData.openingBalance.toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-center">-</td>
                  </tr>

                  {/* TRANSAKSI */}
                  {currentMonthData.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-slate-400 italic">
                        Belum ada transaksi di bulan {activeMonth}
                      </td>
                    </tr>
                  ) : (
                    currentMonthData.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="p-3">{tx.tanggal}</td>
                        <td className="p-3">{tx.noBukti || '-'}</td>
                        <td className="p-3 font-medium text-slate-800">{tx.uraian}</td>
                        <td className="p-3 text-center">{tx.unit}</td>
                        <td className="p-3 text-right">Rp{Number(tx.hargaUnit).toLocaleString('id-ID')}</td>
                        <td className="p-3 text-right text-emerald-600">
                          {tx.jenis === 'pemasukan' ? `Rp${Number(tx.jumlah).toLocaleString('id-ID')}` : '-'}
                        </td>
                        <td className="p-3 text-right text-rose-600">
                          {tx.jenis === 'pengeluaran' ? `Rp${Number(tx.jumlah).toLocaleString('id-ID')}` : '-'}
                        </td>
                        <td className="p-3 text-right font-semibold text-slate-900">
                          Rp{Number(tx.saldoRunning).toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="text-rose-600 hover:text-rose-800 font-bold text-xs"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}