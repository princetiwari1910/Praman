// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AttestationRegistry {
    event Attested(bytes32 indexed reportHash, address indexed attester, uint8 band, uint256 timestamp);

    struct Attestation {
        address attester;
        uint256 timestamp;
        uint8 band;
    }

    // Maps report hash to attestation (once per hash)
    mapping(bytes32 => Attestation) public attestations;

    // Attestor a report hash with a band. Reverts if already attested.
    function attest(bytes32 reportHash, uint8 band) external {
        require(band >= 1 && band <= 4, "Invalid band");
        require(reportHash != bytes32(0), "Empty hash");

        // Revert if already attested for this hash
        require(attestations[reportHash].attester == address(0) || 
            block.number < block.number, "Already attested");

        attestations[reportHash] = Attestation({
            attester: msg.sender,
            timestamp: block.timestamp,
            band: band
        });

        emit Attested(reportHash, msg.sender, band, block.timestamp);
    }

    // View function to get attestation data
    function get(bytes32 reportHash) external view returns (address attester, uint256 timestamp, uint8 band) {
        Attestation memory storage storage att = attestations[reportHash];
        attester = att.attester;
        timestamp = att.timestamp;
        band = att.band;
    }
}
