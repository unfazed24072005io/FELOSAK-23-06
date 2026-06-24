const DocumentCard = ({ document, onPress, onDownload }: { document: Document; onPress: () => void; onDownload: () => void }) => {
  const book = books.find(b => b.id === document.bookId);
  
  return (
    <Pressable onPress={onPress} style={styles.docCard}>
      <View style={[styles.docIconCircle, { 
        backgroundColor: (DOCUMENT_CONFIG[document.type]?.color || '#3B82F6') + '15', 
        width: 44, 
        height: 44, 
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
      }]}>
        <Feather 
          name={DOCUMENT_CONFIG[document.type]?.icon || 'file-text'} 
          size={20} 
          color={DOCUMENT_CONFIG[document.type]?.color || '#3B82F6'} 
        />
      </View>
      
      <View style={styles.docCardContent}>
        <View style={styles.docCardNumber}>
          <Text style={styles.docCardNumberText} numberOfLines={1}>{document.number}</Text>
        </View>
        <View style={styles.docCardParty}>
          <Text style={styles.docCardPartyText} numberOfLines={1}>{document.partyName}</Text>
        </View>
        {book && (
          <Text style={styles.docCardBook} numberOfLines={1}>📁 {book.name}</Text>
        )}
      </View>
      
      <View style={styles.docCardBadgeContainer}>
        <View style={[styles.typeBadge, { backgroundColor: (DOCUMENT_CONFIG[document.type]?.color || '#3B82F6') + '15' }]}>
          <Text style={[styles.typeBadgeText, { color: DOCUMENT_CONFIG[document.type]?.color || '#3B82F6' }]}>
            {document.type}
          </Text>
        </View>
        
        {document.type === "Invoice" && (
          <View style={[
            styles.invoiceStatusBadge,
            { backgroundColor: document.status === 'paid' ? '#10B98120' : '#EF444420' }
          ]}>
            <View style={[
              styles.invoiceStatusDot,
              { backgroundColor: document.status === 'paid' ? '#10B981' : '#EF4444' }
            ]} />
            <Text style={[
              styles.invoiceStatusText,
              { color: document.status === 'paid' ? '#10B981' : '#EF4444' }
            ]}>
              {document.status === 'paid' ? 'Paid' : 'Unpaid'}
            </Text>
          </View>
        )}
        
        <Pressable onPress={onDownload} style={styles.docDownloadBtn}>
          <Feather name="download" size={16} color="#3B82F6" />
        </Pressable>
      </View>
    </Pressable>
  );
};
